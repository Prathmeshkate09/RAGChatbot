import os
import pickle
from typing import List, Dict, Any

import faiss  # type: ignore
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer  # type: ignore
import uvicorn

ROOT = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(ROOT, 'index.faiss')
PKL_PATH = os.path.join(ROOT, 'index.pkl')

# Load metadata (supports dict or tuple formats)
with open(PKL_PATH, 'rb') as f:
    raw = pickle.load(f)

texts: List[str] = []
metas: List[Dict[str, Any]] = []
model_name: str = os.getenv('EMBED_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')

if isinstance(raw, dict):
    texts = raw.get('texts') or raw.get('text') or []
    metas = raw.get('metas') or [{} for _ in texts]
    model_name = raw.get('model_name') or model_name
elif isinstance(raw, (tuple, list)):
    # Try common tuple layouts: (texts, metas, model_name) or (texts, metas)
    if len(raw) >= 1 and isinstance(raw[0], (list, tuple)):
        texts = list(raw[0])
    if len(raw) >= 2 and isinstance(raw[1], (list, tuple)):
        # If metas are not dicts, wrap
        cand = list(raw[1])
        if cand and isinstance(cand[0], dict):
            metas = cand  # type: ignore
        else:
            metas = [{} for _ in texts]
    if len(raw) >= 3 and isinstance(raw[2], str):
        model_name = raw[2]

if not metas or len(metas) != len(texts):
    metas = [{} for _ in texts]

# Load FAISS index early to know ntotal for alignment
index = faiss.read_index(INDEX_PATH)

# Fallback: if texts are empty, try to load from sidecar files (only if enabled)
LOAD_SIDECAR = os.getenv('LOAD_SIDECAR_TEXTS', 'false').lower() == 'true'
if not texts and LOAD_SIDECAR:
    jsonl_path = os.path.join(ROOT, 'texts.jsonl')
    txt_path = os.path.join(ROOT, 'texts.txt')
    try:
        if os.path.exists(jsonl_path):
            with open(jsonl_path, 'r', encoding='utf-8') as jf:
                for line in jf:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        import json
                        obj = json.loads(line)
                        # Accept common keys
                        t = obj.get('text') or obj.get('chunk') or obj.get('content') or ''
                        texts.append(str(t))
                        m = {k: v for k, v in obj.items() if k not in ('text', 'chunk', 'content')}
                        metas.append(m)
                    except Exception:
                        # Fallback: treat line as raw text if not JSON
                        texts.append(line)
                        metas.append({})
        elif os.path.exists(txt_path):
            with open(txt_path, 'r', encoding='utf-8') as tf:
                for line in tf:
                    texts.append(line.rstrip('\n'))
                    metas.append({})
    except Exception as e:
        print('[warn] unable to load sidecar texts:', e)

# Align lengths to index.ntotal to avoid out-of-range
try:
    ntotal = int(index.ntotal)
except Exception:
    ntotal = len(texts)

if len(texts) < ntotal:
    # Pad with empty strings/metas to match index size
    pad = ntotal - len(texts)
    texts.extend([''] * pad)
    metas.extend([{}] * pad)
elif len(texts) > ntotal:
    # Truncate extras beyond index size
    texts = texts[:ntotal]
    metas = metas[:ntotal]

# Load embedder
embedder = SentenceTransformer(model_name)

# (index already loaded above)

# Verify dims if possible
try:
    dim = index.d
    test_vec = embedder.encode(['hello world'], convert_to_numpy=True, normalize_embeddings=True)
    if test_vec.shape[1] != dim:
        raise ValueError(f"Embedding dim {test_vec.shape[1]} != index dim {dim}. Ensure you used the same model to build the index.")
except Exception as e:
    # If check fails, continue but queries may fail noisily
    print('[warn] embedding/index dim check failed:', e)

app = FastAPI()

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

class UpsertRequest(BaseModel):
    texts: List[str]
    metas: List[Dict[str, Any]] | None = None

def save_state():
    try:
        # Persist index
        faiss.write_index(index, INDEX_PATH)
        # Persist metadata
        data = {"texts": texts, "metas": metas, "model_name": model_name}
        with open(PKL_PATH, 'wb') as f:
            pickle.dump(data, f)
    except Exception as e:
        print('[warn] failed to save state:', e)

@app.get('/health')
def health():
    return {"status": "ok", "texts": len(texts)}

@app.get('/stats')
def stats():
    try:
        ntotal = int(index.ntotal)
    except Exception:
        ntotal = -1
    return {
        "status": "ok",
        "texts_count": len(texts),
        "metas_count": len(metas) if metas is not None else 0,
        "index_ntotal": ntotal,
        "model_name": model_name,
    }

@app.post('/search')
def search(req: SearchRequest):
    if not req.query.strip():
        return {"results": []}
    qv = embedder.encode([req.query], convert_to_numpy=True, normalize_embeddings=True).astype('float32')
    # Search a larger candidate set so we can surface any available non-empty entries
    try:
        ntotal = int(index.ntotal)
    except Exception:
        ntotal = req.top_k
    search_k = min(ntotal, max(req.top_k * 100, 1000))
    D, I = index.search(qv, search_k)
    results = []
    for score, idx in zip(D[0], I[0]):
        if len(results) >= req.top_k:
            break
        if int(idx) < 0 or int(idx) >= len(texts):
            continue
        meta = metas[int(idx)] if metas and int(idx) < len(metas) else {}
        t = texts[int(idx)] if int(idx) < len(texts) else ''
        # Try meta fallbacks; if still empty, include a placeholder so client sees a result
        if not t:
            t = meta.get('text') or meta.get('chunk') or meta.get('content') or f"[doc {int(idx)}]"
        meta = dict(meta)
        meta.setdefault('doc_index', int(idx))
        results.append({
            "text": t,
            "score": float(score),
            "meta": meta
        })
    return {"results": results}

@app.post('/search_raw')
def search_raw(req: SearchRequest):
    if not req.query.strip():
        return {"D": [], "I": []}
    qv = embedder.encode([req.query], convert_to_numpy=True, normalize_embeddings=True).astype('float32')
    D, I = index.search(qv, req.top_k)
    return {
        "D": D[0].tolist() if isinstance(D, np.ndarray) else D,
        "I": I[0].tolist() if isinstance(I, np.ndarray) else I,
    }

@app.post('/upsert')
def upsert(req: UpsertRequest):
    new_texts = [str(t) for t in (req.texts or []) if str(t).strip()]
    if not new_texts:
        return {"added": 0}
    # Build embeddings
    vecs = embedder.encode(new_texts, convert_to_numpy=True, normalize_embeddings=True).astype('float32')
    # Add to FAISS
    index.add(vecs)
    # Extend texts/metas
    texts.extend(new_texts)
    if req.metas and isinstance(req.metas, list):
        # Ensure metas length alignment
        add_metas: List[Dict[str, Any]] = []
        for i in range(len(new_texts)):
            m = req.metas[i] if i < len(req.metas) and isinstance(req.metas[i], dict) else {}
            add_metas.append(m)
        metas.extend(add_metas)
    else:
        metas.extend([{} for _ in new_texts])
    save_state()
    return {"added": len(new_texts), "total": len(texts)}

if __name__ == '__main__':
    port = int(os.getenv('PORT', '8000'))
    uvicorn.run(app, host='127.0.0.1', port=port)

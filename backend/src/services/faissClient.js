const axios = require('axios');

const BASE_URL = process.env.FAISS_BASE_URL || 'http://localhost:8000';
const TOP_K = parseInt(process.env.FAISS_TOP_K || '5', 10);
const CACHE_TTL = parseInt(process.env.RAG_CACHE_TTL_MS || '0', 10);

// naive in-memory cache { key: { t: epoch_ms, data: [...] } }
const _cache = new Map();

function getCache(key) {
  if (!CACHE_TTL) return null;
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() - e.t > CACHE_TTL) {
    _cache.delete(key);
    return null;
  }
  return e.data;
}

function setCache(key, data) {
  if (!CACHE_TTL) return;
  _cache.set(key, { t: Date.now(), data });
}

async function search(query, topK = TOP_K) {
  const cacheKey = `${query}::${topK}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  const base = BASE_URL.replace(/\/$/, '');
  const endpoints = ['/search', '/query', '/faiss/search'];
  const payloads = [
    { query, top_k: topK },
    { query, k: topK },
    { q: query, k: topK },
  ];
  const errors = [];
  for (const ep of endpoints) {
    for (const body of payloads) {
      try {
        const { data } = await axios.post(`${base}${ep}`, body, { timeout: 5000 });
        const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        const mapped = results.map(r => ({ text: String(r.text || r.chunk || ''), score: Number(r.score || r.similarity || 0), meta: r.meta || {} }));
        setCache(cacheKey, mapped);
        return mapped;
      } catch (e) {
        errors.push(`${ep} ${JSON.stringify(body)} -> ${e.message}`);
      }
    }
  }
  const errMsg = `[faiss] all attempts failed at ${BASE_URL}. Tried endpoints ${endpoints.join(', ')}. Errors: ${errors.join(' | ')}`;
  const error = new Error(errMsg);
  error.code = 'FAISS_UNAVAILABLE';
  throw error;
}

module.exports = { search };

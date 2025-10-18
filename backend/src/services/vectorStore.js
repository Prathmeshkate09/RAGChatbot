const { embedTexts, cosine } = require('./embeddings');

// Simple in-memory vector store. For production, swap with Pinecone, FAISS, or MongoDB Atlas Vector.
// Structure: { namespace: { vectors: Array<{ id, embedding, text, meta? }> } }
const store = new Map();

function getSpace(ns) {
  if (!store.has(ns)) store.set(ns, { vectors: [] });
  return store.get(ns);
}

async function upsert(ns, id, text, meta = {}) {
  const [embedding] = await embedTexts([text]);
  const space = getSpace(ns);
  const idx = space.vectors.findIndex(v => v.id === id);
  const doc = { id, embedding, text, meta };
  if (idx >= 0) space.vectors[idx] = doc; else space.vectors.push(doc);
}

async function addMany(ns, items) {
  const texts = items.map(i => i.text);
  const embeddings = await embedTexts(texts);
  const space = getSpace(ns);
  items.forEach((item, i) => {
    space.vectors.push({ id: item.id, text: item.text, meta: item.meta || {}, embedding: embeddings[i] });
  });
}

function query(ns, text, topK = 5) {
  const space = getSpace(ns);
  const q = embedTexts([text]);
  return q.then(([qv]) => {
    const scored = space.vectors.map(v => ({ ...v, score: cosine(qv, v.embedding) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  });
}

function clear(ns) {
  store.delete(ns);
}

function count(ns) {
  return getSpace(ns).vectors.length;
}

module.exports = { upsert, addMany, query, clear, count };

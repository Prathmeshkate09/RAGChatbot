const OpenAI = require('openai');

const hasOpenAI = !!process.env.OPENAI_API_KEY;
let openai;
if (hasOpenAI) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function simpleHashVector(text, dims = 256) {
  const v = new Array(dims).fill(0);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    v[code % dims] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map(x => x / norm);
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / ((Math.sqrt(na) || 1) * (Math.sqrt(nb) || 1));
}

async function embedTexts(texts) {
  if (hasOpenAI) {
    const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    const resp = await openai.embeddings.create({ model, input: texts });
    return resp.data.map(d => d.embedding);
  }
  return texts.map(t => simpleHashVector(t));
}

module.exports = { embedTexts, cosine };

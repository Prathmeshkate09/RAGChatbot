const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const PROVIDER = process.env.OPENAI_API_KEY ? 'openai' : (process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'gemini' : 'none');

// Strict whitelist of allowed Gemini models
const ALLOWED_GEMINI_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-preview-image-generation',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-robotics-er-1.5-preview',
  'gemma-3-2b',
  'learnlm-2.0-flash-experimental',
  'imagen-3.0-generate',
  'veo-2.0-generate-001',
];

function llmProvider() {
  if (PROVIDER === 'openai') {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    return {
      name: 'openai',
      chat: async ({ messages }) => {
        const resp = await client.chat.completions.create({
          model,
          messages,
          temperature: 0.8
        });
        return resp.choices?.[0]?.message?.content || '';
      }
    };
  }
  if (PROVIDER === 'gemini') {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const defaultModelId = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const defaultTemp = parseFloat(process.env.GEMINI_TEMPERATURE || '0.8');
    return {
      name: 'gemini',
      chat: async ({ messages, model }) => {
        const useModel = (model && ALLOWED_GEMINI_MODELS.includes(model)) ? model : defaultModelId;
        const modelInstance = genAI.getGenerativeModel({ model: useModel });
        const history = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
        const resp = await modelInstance.generateContent({
          contents: history,
          generationConfig: { temperature: isNaN(defaultTemp) ? 0.8 : defaultTemp }
        });
        return resp.response.text();
      }
    };
  }
  return {
    name: 'none',
    chat: async () => '[LLM not configured] Set OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.'
  };
}

module.exports = { llmProvider, ALLOWED_GEMINI_MODELS };

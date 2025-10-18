const { Router } = require('express');
const { verifyFirebaseToken } = require('../middleware/auth');
const Chat = require('../models/Chat');
const { llmProvider } = require('../services/llm');
const { summarizeMessages, buildContextPrompt } = require('../services/memory');
const { query } = require('../services/vectorStore');
const faiss = require('../services/faissClient');

const router = Router();

function generateTitle(text) {
  if (!text) return 'New Chat';
  let t = String(text).trim();
  // Use first sentence/phrase
  const dotIdx = t.indexOf('.');
  const qIdx = t.indexOf('?');
  const cutIdx = [dotIdx, qIdx].filter(i => i > 0).sort((a,b)=>a-b)[0];
  if (cutIdx && cutIdx > 8) t = t.slice(0, cutIdx);
  // Remove trailing punctuation and common question words
  t = t.replace(/[?!:;,.]+$/,'');
  t = t.replace(/^\s*(what is|what are|explain|describe|tell me about|how to)\s+/i, '');
  // Title-case first letter, limit length
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (t.length > 50) t = t.slice(0, 50).trim();
  // Prefix to avoid being exact question
  return `Topic: ${t}`;
}

// Create a new chat thread
router.post('/new', verifyFirebaseToken, async (req, res, next) => {
  try {
    const { firstMessage } = req.body || {};
    const chat = await Chat.create({
      userId: req?.user?.uid || null,
      title: firstMessage ? generateTitle(firstMessage) : 'New Chat',
      messages: firstMessage
        ? [{ role: 'user', content: String(firstMessage), timestamp: new Date() }]
        : []
    });
    return res.status(201).json({ chatId: chat._id.toString(), chat });
  } catch (e) { next(e); }
});

// Send message in a chat and get AI response (with memory and optional RAG)
router.post('/:id', verifyFirebaseToken, async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const { content, model } = req.body || {};
    if (!content) return res.status(400).json({ error: 'content required' });

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'chat not found' });

    // Ownership check for authenticated users
    if (req.user?.uid && chat.userId && chat.userId !== req.user.uid)
      return res.status(403).json({ error: 'forbidden' });

    // Append user message
    chat.messages.push({ role: 'user', content, timestamp: new Date() });

    // Memory summarization: keep last N messages
    const history = summarizeMessages(chat.messages);

    // RAG: query namespace based on user or chat id
    const ns = req.user?.uid ? `user:${req.user.uid}` : `chat:${chatId}`;
    let retrieved = [];
    const useFaiss = String(process.env.USE_FAISS || 'false').toLowerCase() === 'true';
    const topK = parseInt(process.env.FAISS_TOP_K || '5', 10);

    if (useFaiss) {
      try {
        console.log(`[faiss] querying ${process.env.FAISS_BASE_URL || 'http://localhost:8000'} topK=${topK}`);
        retrieved = await faiss.search(content, topK);
        console.log(`[faiss] got ${retrieved.length} results`);
      } catch (e) {
        console.warn('[faiss] search failed:', e.message);
        retrieved = [];
      }
    } else {
      retrieved = await query(ns, content, topK);
    }

    // Build prompt
    const messages = buildContextPrompt(history, retrieved);

    // LLM
    const llm = llmProvider();
    const answer = await llm.chat({ messages, model });

    // Save assistant message
    chat.messages.push({ role: 'assistant', content: answer, timestamp: new Date() });

    // Ensure title exists
    if (!chat.title && chat.messages.length > 0) {
      const first = chat.messages.find(m => m.role === 'user');
      if (first) chat.title = generateTitle(first.content);
    }

    await chat.save();

    return res.json({ reply: answer, chatId: chat._id.toString(), messages: chat.messages });
  } catch (e) { next(e); }
});

// List previous chats for logged-in user
router.get('/history', verifyFirebaseToken, async (req, res, next) => {
  try {
    if (!req.user?.uid) return res.json({ chats: [] });
    const chats = await Chat.find({ userId: req.user.uid }).sort({ createdAt: -1 }).select('_id title createdAt').lean();
    return res.json({ chats });
  } catch (e) { next(e); }
});

// Get a chat by id (placed after static routes to avoid conflicts)
router.get('/:id', verifyFirebaseToken, async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.id).lean();
    if (!chat) return res.status(404).json({ error: 'chat not found' });
    if (req.user?.uid && chat.userId && chat.userId !== req.user.uid)
      return res.status(403).json({ error: 'forbidden' });
    return res.json({ chat });
  } catch (e) { next(e); }
});

// Delete a specific chat
router.delete('/:id/delete', verifyFirebaseToken, async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'chat not found' });
    if (req.user?.uid && chat.userId && chat.userId !== req.user.uid)
      return res.status(403).json({ error: 'forbidden' });
    await chat.deleteOne();
    return res.json({ ok: true });
  } catch (e) { next(e); }
});

// Update (rename) a specific chat's title
router.put('/:id', verifyFirebaseToken, async (req, res, next) => {
  try {
    const { title } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title required' });
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'chat not found' });
    if (req.user?.uid && chat.userId && chat.userId !== req.user.uid)
      return res.status(403).json({ error: 'forbidden' });
    chat.title = String(title).trim();
    await chat.save();
    return res.json({ ok: true, chatId: chat._id.toString(), title: chat.title });
  } catch (e) { next(e); }
});

module.exports = router;

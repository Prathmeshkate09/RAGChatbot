const { Router } = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const { addMany } = require('../services/vectorStore');
const { verifyFirebaseToken } = require('../middleware/auth');

const ENABLE_IMAGE_OCR = String(process.env.ENABLE_IMAGE_OCR || 'false').toLowerCase() === 'true';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB cap to avoid OOM
  fileFilter: (req, file, cb) => {
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext);
    const isText = ['pdf', 'txt', 'md'].includes(ext);
    if (isText) return cb(null, true);
    if (isImage) {
      if (ENABLE_IMAGE_OCR) return cb(null, true);
      return cb(new Error('Image uploads are disabled. Enable ENABLE_IMAGE_OCR to allow image OCR.'));
    }
    return cb(new Error('Unsupported file type. Allowed: PDF, TXT, MD' + (ENABLE_IMAGE_OCR ? ', images' : '')));
  }
});

function chunkText(text, chunkSize = 800, overlap = 120) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    const slice = text.slice(i, end).trim();
    if (slice) chunks.push(slice);
    i = end - overlap;
    if (i < 0) i = 0;
    if (i >= text.length) break;
  }
  return chunks;
}

async function extractText(file) {
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') {
    const data = await pdfParse(file.buffer);
    return data.text || '';
  }
  if (ext === 'txt' || ext === 'md') {
    return file.buffer.toString('utf8');
  }
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
    if (!ENABLE_IMAGE_OCR) {
      throw new Error('Image OCR is disabled. Enable by setting ENABLE_IMAGE_OCR=true');
    }
    // Lazy-load tesseract.js only when needed to reduce baseline memory usage
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker();
    try {
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      const { data: { text } } = await worker.recognize(file.buffer);
      await worker.terminate();
      return text || '';
    } catch (e) {
      try { await worker.terminate(); } catch {}
      throw new Error('OCR failed for image');
    }
  }
  throw new Error('Unsupported file type. Use PDF or TXT.');
}

// POST /api/upload
// form-data: files[], chatId? (optional). If user is logged in, docs go to user namespace; otherwise to chat namespace.
router.post('/', verifyFirebaseToken, (req, res, next) => {
  upload.array('files', 5)(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Max size is 25MB per file.' });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    try {
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ error: 'No files uploaded' });
  
      const chatId = req.body?.chatId;
      const ns = req.user?.uid ? `user:${req.user.uid}` : (chatId ? `chat:${chatId}` : 'session:anonymous');
  
      const items = [];
      for (const file of files) {
        const text = await extractText(file);
        const chunks = chunkText(text);
        chunks.forEach((t, idx) => {
          items.push({ id: uuidv4(), text: t, meta: { filename: file.originalname, part: idx } });
        });
      }
  
      await addMany(ns, items);
      return res.json({ ok: true, namespace: ns, chunksAdded: items.length });
    } catch (e) { next(e); }
  });
});

module.exports = router;

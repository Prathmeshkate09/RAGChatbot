function summarizeMessages(messages, maxTokens = 800) {
  // Simple heuristic summarizer: truncate oldest content and keep system + last N messages
  // In production, call LLM to summarize. Here we just keep the last ~12 messages.
  const keep = [];
  let count = 0;
  for (let i = messages.length - 1; i >= 0 && keep.length < 12; i--) {
    const m = messages[i];
    keep.push(m);
    count += (m.content?.length || 0);
    if (count > maxTokens * 4) break;
  }
  return keep.reverse();
}

function buildContextPrompt(history, retrievedChunks) {
  const medMode = String(process.env.MEDICAL_MODE || 'false').toLowerCase() === 'true';
  const baseInstruction = medMode
    ? 'You are a medical education assistant for students. Provide clinically accurate, concise explanations, and cite sources when possible. Do not include medical disclaimers unless explicitly asked. Avoid giving diagnoses or treatment instructions; if needed, suggest consulting a professional, but do not append a standard disclaimer at the end. Use markdown with headings and bullet points.'
    : 'You are a helpful AI assistant. Answer concisely with markdown and code blocks if needed.';

  const systemIntro = retrievedChunks && retrievedChunks.length
    ? `You have access to the following relevant context from documents. Prefer this context when answering.\n---\n${retrievedChunks.map((c, i) => `[#${i+1} score=${c.score.toFixed(2)}]\\n${c.text}`).join('\n\n')}\n---\n`
    : '';

  const messages = [];
  messages.push({ role: 'system', content: systemIntro + baseInstruction });
  for (const m of history) messages.push({ role: m.role, content: m.content });
  return messages;
}

module.exports = { summarizeMessages, buildContextPrompt };

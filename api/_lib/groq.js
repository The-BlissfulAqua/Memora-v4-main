const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

const extractGroqText = (body) =>
  body?.choices?.[0]?.message?.content?.trim?.() || '';

async function generateGroqText({ prompt, systemInstruction }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error('Missing server GROQ_API_KEY');
    err.statusCode = 503;
    throw err;
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 180,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body?.error?.message || `Groq request failed (${response.status})`);
    err.statusCode = response.status;
    throw err;
  }

  const text = extractGroqText(body);
  if (!text) {
    const err = new Error('Groq returned empty content');
    err.statusCode = 502;
    throw err;
  }

  return text;
}

module.exports = { generateGroqText };

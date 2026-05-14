const CONFIGURED_AI_API_BASE = (import.meta.env.VITE_AI_API_BASE_URL || '').replace(/\/$/, '');

const getAiApiBase = () => {
  if (CONFIGURED_AI_API_BASE) return CONFIGURED_AI_API_BASE;

  const realtimeUrl = (window as any).__DEMO_REALTIME_URL as string | undefined;
  if (realtimeUrl) {
    return realtimeUrl
      .replace(/^wss:\/\//, 'https://')
      .replace(/^ws:\/\//, 'http://')
      .replace(/\/$/, '') + '/api/ai';
  }

  return '/api/ai';
};

export const missingApiKeyError = 'AI features are unavailable right now. Configure GROQ_API_KEY on the server and restart.';
export const isAiConfigured = true;

const callAiEndpoint = async (
  path: string,
  payload: Record<string, unknown>,
  timeoutMs: number = 12000
): Promise<string> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getAiApiBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (typeof body?.error === 'string') {
        throw new Error(body.error);
      }
      throw new Error(`AI request failed (${response.status})`);
    }

    if (typeof body?.text !== 'string' || !body.text.trim()) {
      throw new Error('Groq returned an empty response.');
    }

    return body.text;
  } finally {
    clearTimeout(timer);
  }
};

export const getAICompanionChatResponse = async (prompt: string): Promise<string> => {
  try {
    return await callAiEndpoint('/companion', { prompt });
  } catch (error) {
    console.error('Error getting AI response:', error);
    if (error instanceof DOMException && error.name === 'AbortError') {
      return "I'm sorry, the AI server is taking too long to respond. Please check the backend and try again.";
    }
    if (error instanceof TypeError) {
      return "I'm sorry, I cannot reach the AI backend right now. Please check the ngrok URL and network connection.";
    }
    if (error instanceof Error && error.message.includes('GROQ_API_KEY')) {
      return missingApiKeyError;
    }
    return "I'm sorry, the Groq AI service is unavailable right now. Let's try again in a moment.";
  }
};

export const getAIComfortingQuote = async (): Promise<string> => {
  try {
    return await callAiEndpoint('/quote', {});
  } catch (error) {
    console.error('Error getting AI quote:', error);
    return 'Every day is a new beginning.';
  }
};

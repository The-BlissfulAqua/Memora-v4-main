import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AICompanion from '../AICompanion';
import { getAICompanionChatResponse } from '../../../services/geminiService';

vi.mock('../../../services/geminiService', () => ({
  isGeminiConfigured: true,
  missingApiKeyError: 'missing',
  getAICompanionChatResponse: vi.fn(async (prompt: string) => `AI: ${prompt}`),
}));

class MockSpeechRecognition {
  static lastInstance: MockSpeechRecognition | null = null;

  continuous = false;
  lang = 'en-US';
  interimResults = false;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  start = vi.fn(() => {
    this.onstart?.();
  });

  stop = vi.fn(() => {
    this.onend?.();
  });

  constructor() {
    MockSpeechRecognition.lastInstance = this;
  }

  emitResult(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ 0: { transcript }, isFinal: true }],
    });
  }

  emitEnd() {
    this.onend?.();
  }
}

describe('AICompanion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockSpeechRecognition.lastInstance = null;
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = undefined;
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('sends typed message on Enter', async () => {
    render(<AICompanion onBack={() => {}} />);

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'hello there' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(getAICompanionChatResponse).toHaveBeenCalledWith('hello there');
    });

    expect(await screen.findByText('AI: hello there')).toBeInTheDocument();
  });

  it('captures microphone transcript and sends once when recognition ends', async () => {
    render(<AICompanion onBack={() => {}} />);

    const micButton = await screen.findByLabelText('Start listening');
    fireEvent.click(micButton);

    const recognition = MockSpeechRecognition.lastInstance;
    expect(recognition).not.toBeNull();

    act(() => {
      recognition!.emitResult('how are you');
      recognition!.emitEnd();
    });

    await waitFor(() => {
      expect(getAICompanionChatResponse).toHaveBeenCalledTimes(1);
      expect(getAICompanionChatResponse).toHaveBeenCalledWith('how are you');
    });

    expect(await screen.findByText('AI: how are you')).toBeInTheDocument();
  });
});

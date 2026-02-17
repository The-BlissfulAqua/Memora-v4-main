import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAICompanionChatResponse, isGeminiConfigured, missingApiKeyError } from '../../services/geminiService';
import MicrophoneIcon from '../icons/MicrophoneIcon';


interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>> & {
    [index: number]: ArrayLike<{ transcript: string }> & { isFinal?: boolean };
  };
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface AICompanionProps {
  onBack: () => void;
}

interface Message {
  text: string;
  sender: 'user' | 'ai';
}

const AICompanion: React.FC<AICompanionProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>(() => [
    { sender: 'ai', text: isGeminiConfigured ? "Hello! I'm Digi, your friendly companion. How are you feeling today?" : missingApiKeyError }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [supportsSpeech, setSupportsSpeech] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef('');
  const isLoadingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);
  

  const handleSendText = useCallback(async (rawText: string) => {
    const textToSend = rawText.trim();
    if (textToSend === '' || isLoadingRef.current) return;

    const userMessage: Message = { text: textToSend, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setSpeechError(null);
    setIsLoading(true);
    setInput('');
    try {
      const aiResponseText = await getAICompanionChatResponse(textToSend);
      const aiMessage: Message = { text: aiResponseText, sender: 'ai' };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSend = useCallback(async () => {
    await handleSendText(input);
  }, [handleSendText, input]);

  // Set up speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
        setSupportsSpeech(true);
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.onstart = () => {
          transcriptRef.current = '';
          setSpeechError(null);
          setIsListening(true);
        };
        recognition.onend = () => {
          setIsListening(false);
          const transcript = transcriptRef.current.trim();
          transcriptRef.current = '';
          if (transcript) {
            handleSendText(transcript);
          }
        };
        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          const start = event.resultIndex ?? 0;
          let latest = '';
          for (let i = start; i < event.results.length; i += 1) {
            const result = event.results[i];
            if (result && result[0]) {
              latest = `${latest} ${result[0].transcript}`.trim();
            }
          }
          if (latest) {
            transcriptRef.current = latest;
            setInput(latest);
          }
        };
        recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setSpeechError('Microphone access was blocked. Please allow microphone permission.');
          } else if (event.error === 'no-speech') {
            setSpeechError('No speech detected. Please try again.');
          } else {
            setSpeechError('Voice input failed. Please try again or type your message.');
          }
          setIsListening(false);
        };
        recognitionRef.current = recognition;
    } else {
        setSupportsSpeech(false);
    }

    return () => {
        if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [handleSendText]);


  const handleListen = () => {
      if (!recognitionRef.current) return;
      if (isListening) {
        recognitionRef.current.stop();
        return;
      }
      transcriptRef.current = '';
      setInput('');
      setSpeechError(null);
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setSpeechError('Could not start voice input. Please try again.');
      }
  };

  return (
    <div className="relative p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl h-[95vh] flex flex-col">
       <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
       <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>
      
      <header className="flex items-center justify-between pb-4 border-b border-slate-700/50">
        <div className="flex items-center">
            <button onClick={onBack} className="text-slate-400 text-sm p-2 rounded-full hover:bg-slate-800/50 transition-colors mr-2 flex items-center gap-1">
                <span className='text-lg'>&larr;</span> Back
            </button>
            <div className="text-2xl mr-3">❤️</div>
            <div>
                <h2 className="text-xl font-bold text-white">Your Companion, Digi</h2>
                <p className={`text-sm font-semibold ${isGeminiConfigured ? 'text-green-400' : 'text-yellow-400'}`}>
                    {isGeminiConfigured ? 'Online' : 'Limited'}
                </p>
            </div>
        </div>
      </header>
      
      <div className="flex-grow my-2 overflow-y-auto pr-2">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow-md ${
                  msg.sender === 'user' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-gray-300'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex justify-start">
                <div className="bg-slate-800 rounded-xl p-3 shadow-md">
                    <div className="flex items-center space-x-1">
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                    </div>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="mt-auto flex items-center border-t border-slate-700/50 pt-4 gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isListening ? 'Listening...' : "Type a message..."}
          className="flex-grow px-4 py-3 bg-slate-800/70 border border-slate-700 rounded-full text-white placeholder-slate-400 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-colors disabled:bg-slate-800/40 disabled:cursor-not-allowed"
          disabled={isLoading || !isGeminiConfigured}
        />
        {supportsSpeech && recognitionRef.current && (
            <button
              type="button"
              onClick={handleListen}
              disabled={isLoading || !isGeminiConfigured}
              className={`flex-shrink-0 w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                  isListening 
                  ? 'bg-red-600 text-white animate-pulse focus:ring-red-500' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 focus:ring-slate-500'
              } disabled:bg-slate-800/40 disabled:cursor-not-allowed`}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              <MicrophoneIcon className="w-6 h-6" />
            </button>
        )}
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || input.trim() === '' || !isGeminiConfigured}
          className="flex-shrink-0 w-12 h-12 bg-slate-700 text-white font-bold rounded-full disabled:bg-slate-800/40 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors flex items-center justify-center"
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
        </button>
      </div>
      {speechError && (
        <p className="mt-2 text-sm text-amber-300">{speechError}</p>
      )}
    </div>
  );
};

export default AICompanion;

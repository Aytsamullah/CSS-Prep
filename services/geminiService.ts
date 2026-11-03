import { Question, Rubric, AIResponse, NewsBriefingResponse, BookResource, InterviewMessage, InterviewFeedback } from '../types';

const parseApiError = (status: number, errorData: any): string => {
  let msg = errorData?.error || '';
  try {
    const parsed = JSON.parse(msg);
    if (parsed.error?.message) {
      msg = parsed.error.message;
    }
  } catch {}

  if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'API quota limit reached. To increase your quota, please attach a billing-enabled API key in the Settings > Secrets panel.';
  }
  return msg || `Request failed with status ${status}`;
};

export const evaluateAnswer = async (
  question: Question,
  studentAnswer: string,
  rubric: Rubric
): Promise<AIResponse> => {
  const response = await fetch('/api/gemini/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, studentAnswer, rubric }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(parseApiError(response.status, errorData));
  }

  return response.json();
};

export const fetchNewsBriefing = async (forceRefresh = false): Promise<NewsBriefingResponse> => {
  const url = forceRefresh ? '/api/gemini/news?refresh=true' : '/api/gemini/news';
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(parseApiError(response.status, errorData));
  }

  return response.json();
};

export const findBooksForSubject = async (subject: string): Promise<BookResource[]> => {
  const response = await fetch('/api/gemini/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(parseApiError(response.status, errorData));
  }

  return response.json();
};

export const generateMCQs = async (subject: string, difficulty: string, count: number): Promise<Question[]> => {
  const response = await fetch('/api/gemini/mcqs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, difficulty, count }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(parseApiError(response.status, errorData));
  }

  return response.json();
};

export const generateShortAnswerQuestions = async (subject: string, difficulty: string, count: number): Promise<Question[]> => {
  const response = await fetch('/api/gemini/short-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, difficulty, count }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(parseApiError(response.status, errorData));
  }

  return response.json();
};

export const getInterviewQuestion = async (
  history: InterviewMessage[], 
  language: string, 
  topic: string
): Promise<string> => {
  const response = await fetch('/api/gemini/interview-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, language, topic }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(parseApiError(response.status, errorData));
  }

  const data = await response.json();
  return data.question || 'Tell me about yourself.';
};

export const getInterviewFeedback = async (history: InterviewMessage[]): Promise<InterviewFeedback> => {
  const response = await fetch('/api/gemini/interview-feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(parseApiError(response.status, errorData));
  }

  return response.json();
};

/**
 * Server-Sent Events (SSE) streaming helper for continuous text generation
 */
export const streamGeminiContent = async (
  prompt: string,
  onChunk: (text: string) => void,
  systemInstruction?: string
): Promise<void> => {
  const response = await fetch('/api/gemini/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemInstruction }),
  });

  if (!response.ok || !response.body) {
    throw new Error('Streaming failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (dataStr === '[DONE]') return;

      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.text) {
          onChunk(parsed.text);
        }
      } catch {
        // ignore
      }
    }
  }
};

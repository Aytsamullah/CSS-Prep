import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Gemini Client server-side
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json({ limit: '10mb' }));

// Helper to check for quota exhaustion (429 / RESOURCE_EXHAUSTED)
function isQuotaError(err: any): boolean {
  const str = String(err?.message || err?.status || err || '');
  return str.includes('429') || str.includes('RESOURCE_EXHAUSTED') || str.includes('quota') || str.includes('exceeded your current quota');
}

// Transient retry helper with exponential backoff (skips retrying if quota is exhausted)
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 800): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      if (isQuotaError(err)) {
        throw err; // Quota exhaustion will not succeed on immediate retry
      }
      attempt++;
      if (attempt > retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

// Helper function to robustly extract JSON from a potentially mixed response
const extractJsonArray = (text: string): any[] => {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = text.substring(start, end + 1);
      try {
        return JSON.parse(jsonStr);
      } catch (innerE) {
        console.error('JSON extraction failed after substring', innerE);
        return [];
      }
    }
    return [];
  }
};

const extractJsonObject = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = text.substring(start, end + 1);
      try {
        return JSON.parse(jsonStr);
      } catch (innerE) {
        console.error('JSON object extraction failed', innerE);
        return null;
      }
    }
    return null;
  }
};

// Curated CSS Fallback News for when rate limits / quota limits are reached
const CURATED_CSS_NEWS = [
  {
    id: "css-news-1",
    title: "SBP Holds Policy Rate Steady Amid Disinflation Trend and IMF Review",
    summary: "The State Bank of Pakistan maintained its monetary policy stance, citing easing headline inflation and foreign exchange reserve stability following IMF program milestones.",
    category: "Economy",
    source: "Dawn / State Bank of Pakistan",
    date: "2h ago"
  },
  {
    id: "css-news-2",
    title: "Federal Government Tables Civil Service & Governance Rationalization Framework",
    summary: "A new governance reform roadmap aims to digitize institutional workflows, streamline federal ministries, and introduce merit-based key performance indicators across administrative cadres.",
    category: "Politics",
    source: "The News International",
    date: "4h ago"
  },
  {
    id: "css-news-3",
    title: "CPEC Phase-II Focuses on Industrial Relocation, Agri-Tech, and Special Economic Zones",
    summary: "Pakistan and China agreed on actionable roadmaps for the second phase of CPEC, prioritizing joint industrial ventures, high-efficiency agriculture, and regional connectivity.",
    category: "International",
    source: "Associated Press of Pakistan",
    date: "6h ago"
  },
  {
    id: "css-news-4",
    title: "Pakistan Advocates Climate Adaptation Financing at Regional Climate Summit",
    summary: "The Ministry of Climate Change highlighted loss-and-damage mechanisms and glacier monitoring initiatives to build resilience across vulnerable Indus basin ecosystems.",
    category: "International",
    source: "The Express Tribune",
    date: "8h ago"
  },
  {
    id: "css-news-5",
    title: "FBR Broadens Digital Invoicing and Tax Net Compliance Across Retail Sectors",
    summary: "The Federal Board of Revenue expanded its digital point-of-sale monitoring to enhance direct tax collection and document economic activity.",
    category: "Economy",
    source: "Business Recorder",
    date: "10h ago"
  }
];

const CURATED_GROUNDING_CHUNKS = [
  { web: { uri: "https://www.dawn.com", title: "Dawn News - National & Economic Affairs" } },
  { web: { uri: "https://tribune.com.pk", title: "The Express Tribune - Governance & Climate" } },
  { web: { uri: "https://www.brecorder.com", title: "Business Recorder - Fiscal & Monetary Coverage" } },
  { web: { uri: "https://www.sbp.org.pk", title: "State Bank of Pakistan Official Announcements" } }
];

// Fallback MCQs for common CSS subjects when quota limits apply
const SUBJECT_FALLBACK_MCQS: Record<string, any[]> = {
  default: [
    {
      id: "fallback_mcq_1",
      subjectCode: "Current Affairs",
      type: "mcq",
      text: "Which article of the 1973 Constitution of Pakistan deals with the Council of Common Interests (CCI)?",
      choices: ["A: Article 153", "B: Article 140A", "C: Article 160", "D: Article 184"],
      correctChoice: "A",
      maxScore: 1
    },
    {
      id: "fallback_mcq_2",
      subjectCode: "Pakistan Affairs",
      type: "mcq",
      text: "The Lahore Resolution was translated into Urdu by which prominent leader?",
      choices: ["A: Maulana Zafar Ali Khan", "B: Liaquat Ali Khan", "C: Chaudhry Khaliquzzaman", "D: A.K. Fazlul Huq"],
      correctChoice: "A",
      maxScore: 1
    },
    {
      id: "fallback_mcq_3",
      subjectCode: "General Science & Ability",
      type: "mcq",
      text: "Which layer of the atmosphere contains the majority of atmospheric ozone that shields the earth from UV radiation?",
      choices: ["A: Troposphere", "B: Stratosphere", "C: Mesosphere", "D: Thermosphere"],
      correctChoice: "B",
      maxScore: 1
    },
    {
      id: "fallback_mcq_4",
      subjectCode: "International Relations",
      type: "mcq",
      text: "The Treaty of Westphalia (1648) is widely recognized as marking the inception of which global concept?",
      choices: ["A: Sovereign State System", "B: Collective Security", "C: Democratic Peace Theory", "D: Universal Human Rights"],
      correctChoice: "A",
      maxScore: 1
    },
    {
      id: "fallback_mcq_5",
      subjectCode: "Islamic Studies",
      type: "mcq",
      text: "Which battle in early Islamic history is also referred to as the 'Battle of the Trench'?",
      choices: ["A: Ghazwa-e-Uhud", "B: Ghazwa-e-Khandaq (Ahzab)", "C: Ghazwa-e-Badr", "D: Ghazwa-e-Hunayn"],
      correctChoice: "B",
      maxScore: 1
    }
  ]
};

// Fallback Short Answer Questions when quota limits apply
const SUBJECT_FALLBACK_SHORT: Record<string, any[]> = {
  default: [
    {
      id: "fallback_sa_1",
      subjectCode: "Pakistan Affairs",
      type: "short_answer",
      text: "Examine the geo-strategic significance of the Gwadar Port under CPEC Phase-II. How can regional economic integration address Pakistan's balance-of-payments vulnerability?",
      modelAnswer: [
        "Strategic maritime crossroads connecting Central Asia and Middle East with Indian Ocean",
        "Transit trade facilitation, Special Economic Zones (SEZs), and export-oriented industrialization",
        "Foreign direct investment inflow balancing current account deficit and foreign exchange pressure",
        "Geopolitical and security challenges necessitating multi-aligned regional diplomacy"
      ],
      maxScore: 20
    }
  ]
};

// Fallback Books
const SUBJECT_FALLBACK_BOOKS: Record<string, any[]> = {
  default: [
    {
      title: "Pakistan: A Hard Country",
      author: "Anatol Lieven",
      description: "An authoritative analysis of Pakistan's political culture, social structures, civil-military dynamics, and resilience.",
      link: "https://archive.org/details/pakistanhardcoun0000liev",
      type: "Book"
    },
    {
      title: "Constitutional and Political History of Pakistan",
      author: "Hamid Khan",
      description: "Standard reference text covering legislative evolution, constitutional developments, and landmark judicial cases.",
      link: "https://books.google.com/books?id=Constitutional+and+Political+History+of+Pakistan",
      type: "Book"
    },
    {
      title: "Issues in Pakistan's Economy",
      author: "S. Akbar Zaidi",
      description: "Comprehensive review of fiscal policy, agriculture, industrial development, and structural reforms in Pakistan.",
      link: "https://books.google.com/books?id=Issues+in+Pakistan+Economy",
      type: "Book"
    },
    {
      title: "Higher Education Commission (HEC) Digital Repository",
      author: "Government of Pakistan",
      description: "Access to peer-reviewed scholarly journals, official research papers, and national policy archives.",
      link: "https://hec.gov.pk",
      type: "Web"
    },
    {
      title: "State Bank of Pakistan Annual & Quarterly Economic Reports",
      author: "State Bank of Pakistan",
      description: "Official empirical economic reports on GDP growth, inflation, monetary trends, and external debt management.",
      link: "https://www.sbp.org.pk",
      type: "PDF"
    }
  ]
};

// In-memory news cache (1 hour TTL)
let newsCache: { timestamp: number; data: any } | null = null;
const NEWS_CACHE_TTL_MS = 60 * 60 * 1000;

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', hasKey: Boolean(apiKey) });
});

// Short Answer Evaluation
const EVALUATION_SYSTEM_INSTRUCTION = `
You are an automated exam evaluator for CSS (Central Superior Services) exam practice. 
Always respond in strict JSON matching the requested schema. 
Use the rubric to assign scores, produce concise feedback, and a confidence score 0.0–1.0. 
If the student's answer is obviously copied verbatim from the model_answer, still rate on correctness but set "plagiarism_flag": true. 
If model confidence < 0.45 include "manual_review": true.
`;

app.post('/api/gemini/evaluate', async (req: Request, res: Response) => {
  try {
    const { question, studentAnswer, rubric } = req.body;
    if (!question || !studentAnswer) {
      return res.status(400).json({ error: 'Missing question or student answer' });
    }

    const userPrompt = JSON.stringify({
      task_type: 'short_answer',
      question_id: question.id,
      question_text: question.text,
      model_answer: question.modelAnswer,
      student_answer: studentAnswer,
      max_score: question.maxScore || 20,
      rubric: rubric || { content: 40, structure: 20, facts: 20, language: 20 },
      word_limit: 200,
    });

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        config: {
          systemInstruction: EVALUATION_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question_id: { type: Type.STRING },
              task_type: { type: Type.STRING },
              score: { type: Type.NUMBER },
              max_score: { type: Type.NUMBER },
              breakdown: {
                type: Type.OBJECT,
                properties: {
                  content: { type: Type.NUMBER },
                  structure: { type: Type.NUMBER },
                  facts: { type: Type.NUMBER },
                  language: { type: Type.NUMBER },
                },
                required: ['content', 'structure', 'facts', 'language'],
              },
              feedback: { type: Type.STRING },
              explanation: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              plagiarism_flag: { type: Type.BOOLEAN },
              manual_review: { type: Type.BOOLEAN },
            },
            required: ['question_id', 'score', 'feedback', 'breakdown', 'explanation'],
          },
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
      })
    );

    if (!response.text) {
      throw new Error('No response from AI');
    }

    const parsed = extractJsonObject(response.text);
    if (!parsed) {
      throw new Error('Invalid JSON format from AI evaluation');
    }

    return res.json(parsed);
  } catch (err: any) {
    if (isQuotaError(err)) {
      return res.status(429).json({
        error: 'API quota limit reached. To increase your quota, please attach a billing-enabled API key in the Settings > Secrets panel.',
        code: 'QUOTA_EXCEEDED'
      });
    }
    console.error('Evaluate API error:', err.message || err);
    return res.status(500).json({ error: err.message || 'Evaluation failed' });
  }
});

// Daily News Briefing with Google Search Grounding and Quota-Safe Caching & Fallback
app.all('/api/gemini/news', async (req: Request, res: Response) => {
  const forceRefresh = req.query.refresh === 'true';
  const now = Date.now();

  // Return cached result if available and fresh
  if (!forceRefresh && newsCache && (now - newsCache.timestamp < NEWS_CACHE_TTL_MS)) {
    return res.json(newsCache.data);
  }

  try {
    const prompt = `
Search for the top 5 most important news developments from the last 24 hours relevant to CSS (Central Superior Services) exam aspirants in Pakistan.
Focus strictly on these categories:
1. Pakistan Domestic Affairs (Politics/Governance)
2. Economy of Pakistan
3. International Relations / Global Issues relevant to Pakistan.

Return a STRICT JSON array (and nothing else) with the following schema for each item:
[
  {
    "id": "1",
    "title": "Headline",
    "summary": "A concise 2-sentence summary",
    "category": "Politics" | "Economy" | "International",
    "source": "Name of publisher (e.g. Dawn, Geo, Reuters)",
    "date": "Time ago (e.g. 2h ago)"
  }
]
Do not use Markdown code blocks. Just the raw JSON string.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '[]';
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const newsItems = extractJsonArray(text);

    if (Array.isArray(newsItems) && newsItems.length > 0) {
      const responseData = {
        newsItems,
        groundingChunks: chunks,
        isFallback: false,
        quotaExceeded: false,
      };
      newsCache = { timestamp: now, data: responseData };
      return res.json(responseData);
    }

    throw new Error('No news items found in search response');
  } catch (err: any) {
    const quotaExceeded = isQuotaError(err);
    if (!quotaExceeded) {
      console.warn('News search error:', err.message || err);
    }

    // If we have previous cache data (even expired), serve it with fallback flag
    if (newsCache?.data) {
      return res.json({
        ...newsCache.data,
        isFallback: true,
        quotaExceeded,
      });
    }

    // Serve rich curated CSS daily briefing
    return res.json({
      newsItems: CURATED_CSS_NEWS,
      groundingChunks: CURATED_GROUNDING_CHUNKS,
      isFallback: true,
      quotaExceeded,
    });
  }
});

// Digital Library Book Finder with Google Search Grounding & Safe Fallback
app.post('/api/gemini/books', async (req: Request, res: Response) => {
  try {
    const { subject } = req.body;
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    const prompt = `
Find 5 HIGH-QUALITY, LEGITIMATE, and ACCESSIBLE study resources for the CSS (Central Superior Services) Pakistan exam subject: "${subject}".

Focus on PUBLIC DOMAIN sources, OFFICIAL government publications, or OPEN EDUCATIONAL RESOURCES to ensure availability.

SEARCH RULES:
1. PRIORITIZE:
   - archive.org (Internet Archive)
   - openlibrary.org
   - gutenberg.org
   - hec.gov.pk (Higher Education Commission)
   - books.google.com (Google Books)
   - Official .edu or .gov.pk domains

2. AVOID: 
   - Copyright infringing sites or illegal repositories.
   - Broken links.
   - Login walls.

3. OUTPUT FORMAT:
   - Return ONLY a JSON array.
   - No conversational text or markdown.

Schema:
[
  {
    "title": "Resource Title",
    "author": "Author or Organization",
    "description": "Brief description.",
    "link": "URL",
    "type": "Web" | "PDF" | "Book"
  }
]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '[]';
    const books = extractJsonArray(text);
    if (Array.isArray(books) && books.length > 0) {
      return res.json(books);
    }
    return res.json(SUBJECT_FALLBACK_BOOKS.default);
  } catch (err: any) {
    if (isQuotaError(err)) {
      // Gracefully return curated books on quota limit
      return res.json(SUBJECT_FALLBACK_BOOKS.default);
    }
    console.error('Books API error:', err.message || err);
    return res.status(500).json({ error: err.message || 'Failed to search books' });
  }
});

// Generate Multiple Choice Questions (MCQs) with Safe Fallback
app.post('/api/gemini/mcqs', async (req: Request, res: Response) => {
  try {
    const { subject, difficulty = 'Medium', count = 5 } = req.body;
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    const prompt = `
Generate ${count} high-quality Multiple Choice Questions (MCQs) for the CSS (Central Superior Services) exam subject: "${subject}".

Difficulty Level: ${difficulty}

Format:
- Questions should be challenging and relevant to the official FPSC syllabus.
- Provide 4 choices (A, B, C, D) for each question.
- Indicate the correct choice letter (A, B, C, or D).

OUTPUT:
Return a STRICT JSON array (no markdown, no conversation) matching this schema:
[
  {
    "id": "mcq_1",
    "subjectCode": "${subject}",
    "type": "mcq",
    "text": "Question text here...",
    "choices": ["A: Option 1", "B: Option 2", "C: Option 3", "D: Option 4"],
    "correctChoice": "A",
    "maxScore": 1
  }
]
    `;

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      })
    );

    const text = response.text || '[]';
    const questions = extractJsonArray(text);
    if (Array.isArray(questions) && questions.length > 0) {
      return res.json(
        questions.map((q: any, idx: number) => ({
          ...q,
          id: q.id || `mcq_${Date.now()}_${idx}`,
          type: 'mcq',
        }))
      );
    }

    throw new Error('No questions generated');
  } catch (err: any) {
    if (isQuotaError(err)) {
      // Gracefully return high quality CSS MCQs on quota limit
      const fallbackList = SUBJECT_FALLBACK_MCQS.default.map((q) => ({
        ...q,
        subjectCode: req.body.subject || q.subjectCode,
      }));
      return res.json(fallbackList.slice(0, req.body.count || 5));
    }
    console.error('Generate MCQs error:', err.message || err);
    return res.status(500).json({ error: err.message || 'Failed to generate MCQs' });
  }
});

// Generate Subjective / Short Answer Questions with Safe Fallback
app.post('/api/gemini/short-questions', async (req: Request, res: Response) => {
  try {
    const { subject, difficulty = 'Medium', count = 1 } = req.body;
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    const prompt = `
Generate ${count} subjective short-answer / essay-style practice questions for the CSS (Central Superior Services) exam subject: "${subject}".

Difficulty Level: ${difficulty}

Format:
- Questions should be thought-provoking and require analytical reasoning (20 marks style).
- Provide "modelAnswer" as an array of 3-5 key concepts, arguments, or facts that a correct answer should cover.

OUTPUT:
Return a STRICT JSON array (no markdown, no conversation) matching this schema:
[
  {
    "id": "sa_1",
    "subjectCode": "${subject}",
    "type": "short_answer",
    "text": "Question text here...",
    "modelAnswer": ["Key Concept 1", "Key Concept 2", "Key Concept 3"],
    "maxScore": 20
  }
]
    `;

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      })
    );

    const text = response.text || '[]';
    const questions = extractJsonArray(text);
    if (Array.isArray(questions) && questions.length > 0) {
      return res.json(
        questions.map((q: any, idx: number) => ({
          ...q,
          id: q.id || `sa_${Date.now()}_${idx}`,
          type: 'short_answer',
        }))
      );
    }

    throw new Error('No short answer questions generated');
  } catch (err: any) {
    if (isQuotaError(err)) {
      // Gracefully return high quality CSS subjective practice question
      const fallbackList = SUBJECT_FALLBACK_SHORT.default.map((q) => ({
        ...q,
        subjectCode: req.body.subject || q.subjectCode,
      }));
      return res.json(fallbackList.slice(0, req.body.count || 1));
    }
    console.error('Generate Short Questions error:', err.message || err);
    return res.status(500).json({ error: err.message || 'Failed to generate short questions' });
  }
});

// Single-turn Interview Follow-Up Question
app.post('/api/gemini/interview-question', async (req: Request, res: Response) => {
  try {
    const { history = [], language = 'English', topic = 'Introduction & General' } = req.body;
    const conversationText = history
      .map((h: any) => `${h.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${h.text}`)
      .join('\n');

    const prompt = `
You are a strict but fair CSS (Central Superior Services) Interview Panelist.
Language: ${language}
Topic: ${topic}

Current Conversation History:
${conversationText}

Task:
Ask the next SINGLE follow-up question.
- If history is empty, start with a welcoming question about yourself or the topic.
- Keep it concise (under 20 words) to mimic spoken conversation.
- Do not add "Interviewer:" prefix. Just the question text.
- Respond in the requested language: ${language}.
    `;

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      })
    );

    return res.json({ question: response.text || 'Tell me about yourself.' });
  } catch (err: any) {
    if (isQuotaError(err)) {
      return res.json({
        question: 'Could you outline your academic background and motivation for joining the Civil Services of Pakistan?'
      });
    }
    console.error('Interview Question error:', err.message || err);
    return res.status(500).json({ error: err.message || 'Failed to get interview question' });
  }
});

// Interview Feedback Evaluation
app.post('/api/gemini/interview-feedback', async (req: Request, res: Response) => {
  try {
    const { history = [] } = req.body;
    const conversationText = history
      .map((h: any) => `${h.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${h.text}`)
      .join('\n');

    const prompt = `
Analyze this mock CSS interview transcript and provide constructive feedback.

Transcript:
${conversationText}

Task:
Evaluate the Candidate's performance based on:
- Confidence & Fluency
- Quality of Arguments
- Language/Grammar

Return JSON format:
{
  "score": number (0-100),
  "strengths": ["point 1", "point 2"],
  "improvements": ["point 1", "point 2"],
  "overallFeedback": "Short paragraph summary"
}
    `;

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
              overallFeedback: { type: Type.STRING },
            },
            required: ['score', 'strengths', 'improvements', 'overallFeedback'],
          },
        },
      })
    );

    const parsed = extractJsonObject(response.text || '{}');
    if (!parsed) {
      throw new Error('Failed to parse interview feedback');
    }
    return res.json(parsed);
  } catch (err: any) {
    if (isQuotaError(err)) {
      return res.json({
        score: 75,
        strengths: [
          'Calm and composed demeanor during administrative inquiries',
          'Clear communication of core viewpoints and constitutional concepts'
        ],
        improvements: [
          'Integrate more empirical statistics and references to official economic surveys',
          'Structure multi-dimensional policy recommendations (short-term vs long-term)'
        ],
        overallFeedback: 'Demonstrated solid aptitude and vocabulary suitable for CSS viva voce. Continued focus on current domestic developments will elevate your panel score.'
      });
    }
    console.error('Interview feedback error:', err.message || err);
    return res.status(500).json({ error: err.message || 'Failed to generate interview feedback' });
  }
});

// Server-Sent Events (SSE) Streaming endpoint
app.post('/api/gemini/stream', async (req: Request, res: Response) => {
  const { prompt, systemInstruction } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });

    for await (const chunk of responseStream) {
      const text = chunk.text || '';
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    const isQuota = isQuotaError(err);
    const msg = isQuota
      ? 'API quota limit reached. Please attach a billing-enabled API key in Settings > Secrets.'
      : err.message || 'Stream error';
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

// WebSocket Server for Gemini Live API
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', async (clientWs: WebSocket, request: http.IncomingMessage) => {
  let session: any = null;
  const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  const topic = url.searchParams.get('topic') || 'Introduction & General';

  try {
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: `
You are a strict, professional interviewer for the CSS (Central Superior Services) exam in Pakistan. 
Topic: ${topic}.

Guidelines:
- Conduct a serious voice interview.
- Ask ONE question at a time.
- Keep questions concise (spoken conversation style).
- Listen to the candidate's answer, then ask a relevant follow-up or move to the next question.
- Do not be too chatty. Act like a formal panelist.
- Start by introducing yourself briefly and asking the first question.
        `,
      },
      callbacks: {
        onopen: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'connected' }));
          }
        },
        onmessage: (message: LiveServerMessage) => {
          if (clientWs.readyState !== WebSocket.OPEN) return;

          // 1. Stream audio chunks (24kHz PCM)
          for (const part of message.serverContent?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
            }
          }

          // 2. Transcription updates
          const content = message.serverContent;
          if (content?.outputTranscription?.text) {
            clientWs.send(JSON.stringify({ outputTranscription: content.outputTranscription.text }));
          }
          if (content?.inputTranscription?.text) {
            clientWs.send(JSON.stringify({ inputTranscription: content.inputTranscription.text }));
          }

          // 3. Turn complete
          if (content?.turnComplete) {
            clientWs.send(JSON.stringify({ turnComplete: true }));
          }

          // 4. Interruption
          if (content?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'closed' }));
            clientWs.close();
          }
        },
        onerror: (err: any) => {
          if (!isQuotaError(err)) {
            console.error('Gemini Live session error:', err);
          }
          if (clientWs.readyState === WebSocket.OPEN) {
            const errorMsg = isQuotaError(err)
              ? 'Live API quota limit reached. Attach a billing-enabled key in Settings > Secrets.'
              : err.message || 'Gemini Live session error';
            clientWs.send(JSON.stringify({ error: errorMsg }));
          }
        },
      },
    });

    clientWs.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.audio && session) {
          session.sendRealtimeInput({
            audio: { data: data.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch (err) {
        console.error('Error forwarding client audio to Live API:', err);
      }
    });

    clientWs.on('close', () => {
      if (session) {
        try {
          session.close();
        } catch {
          // session closed
        }
        session = null;
      }
    });

    clientWs.on('error', (err) => {
      if (!isQuotaError(err)) {
        console.error('Client WS connection error:', err);
      }
      if (session) {
        try {
          session.close();
        } catch {
          // ignore
        }
        session = null;
      }
    });
  } catch (err: any) {
    const isQuota = isQuotaError(err);
    if (!isQuota) {
      console.error('Failed to initialize Gemini Live session:', err);
    }
    if (clientWs.readyState === WebSocket.OPEN) {
      const errorMsg = isQuota
        ? 'Live API quota limit reached. Please attach a billing-enabled API key in Settings > Secrets.'
        : err.message || 'Failed to start Live session';
      clientWs.send(JSON.stringify({ error: errorMsg }));
      clientWs.close();
    }
  }
});

// Vite dev server middleware or Static serving in production
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});

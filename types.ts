

export enum TaskType {
  MCQ = 'mcq',
  SHORT_ANSWER = 'short_answer'
}

export interface Subject {
  code: string;
  name: string;
  category: 'Compulsory' | 'Optional';
  group?: string;
  marks: number;
}

export interface Question {
  id: string;
  subjectCode: string;
  type: TaskType;
  text: string;
  choices?: string[]; // For MCQ
  correctChoice?: string; // For MCQ ('A', 'B', 'C', 'D')
  modelAnswer?: string[]; // Keypoints for short answer
  maxScore: number;
}

export interface Rubric {
  content: number;
  structure: number;
  facts: number;
  language: number;
}

export interface EvaluationBreakdown {
  content: number;
  structure: number;
  facts: number;
  language: number;
}

export interface AIResponse {
  question_id: string;
  task_type: string;
  score: number;
  max_score: number;
  breakdown: EvaluationBreakdown;
  feedback: string;
  explanation: string;
  confidence: number;
  plagiarism_flag: boolean;
  manual_review: boolean;
}

export interface NewsHeadline {
  id: string;
  title: string;
  source: string;
  date: string;
  category: string;
  summary: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  date: string;
}

export interface UserStats {
  mcqsAttempted: number;
  mcqAccuracy: number;
  shortAnswersSubmitted: number;
  averageShortScore: number;
  recentActivity: { date: string; action: string; score?: string }[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface NewsBriefingResponse {
  newsItems: NewsItem[];
  groundingChunks: GroundingChunk[];
  isFallback?: boolean;
  quotaExceeded?: boolean;
}

export interface BookResource {
  title: string;
  author: string;
  description: string;
  link: string;
  type: 'PDF' | 'Web' | 'Book';
}

export interface InterviewMessage {
  role: 'ai' | 'user';
  text: string;
  timestamp: number;
}

export interface InterviewFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  overallFeedback: string;
}

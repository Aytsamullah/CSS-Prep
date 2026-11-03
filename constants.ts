import { Subject, Question, TaskType, NewsHeadline, UserStats } from './types';

export const COMPULSORY_SUBJECTS: Subject[] = [
  { code: 'P1', name: 'English Essay', category: 'Compulsory', marks: 100 },
  { code: 'P2', name: 'English (Precis & Composition)', category: 'Compulsory', marks: 100 },
  { code: 'P3', name: 'General Science & Ability', category: 'Compulsory', marks: 100 },
  { code: 'P4', name: 'Current Affairs', category: 'Compulsory', marks: 100 },
  { code: 'P5', name: 'Pakistan Affairs', category: 'Compulsory', marks: 100 },
  { code: 'P6', name: 'Islamic Studies', category: 'Compulsory', marks: 100 },
];

export const OPTIONAL_SUBJECTS: Subject[] = [
  { code: 'O1', name: 'International Relations', category: 'Optional', group: 'I', marks: 200 },
  { code: 'O2', name: 'Political Science', category: 'Optional', group: 'I', marks: 200 },
  { code: 'O3', name: 'History of USA', category: 'Optional', group: 'IV', marks: 100 },
  { code: 'O4', name: 'Public Administration', category: 'Optional', group: 'V', marks: 100 },
  { code: 'O5', name: 'Sociology', category: 'Optional', group: 'VI', marks: 100 },
];

export const MOCK_NEWS: NewsHeadline[] = [
  {
    id: '1',
    title: 'FPSC Announces Schedule for CSS 2025 Exams',
    source: 'Dawn News',
    date: '2024-05-10',
    category: 'Exam Updates',
    summary: 'The Federal Public Service Commission has released the tentative schedule for the upcoming competitive examinations.'
  },
  {
    id: '2',
    title: 'Economic Survey 2024 Released: Key Highlights',
    source: 'The News',
    date: '2024-05-08',
    category: 'Economy',
    summary: 'GDP growth projected at 3.5% as inflation shows signs of deceleration in the second quarter.'
  },
  {
    id: '3',
    title: 'Climate Change Impact on South Asian Monsoons',
    source: 'Al Jazeera',
    date: '2024-05-05',
    category: 'Current Affairs',
    summary: 'New report suggests erratic monsoon patterns may increase water scarcity risks in the Indus Basin.'
  }
];

export const MOCK_QUESTIONS: Question[] = [
  // MCQs
  {
    id: 'm1',
    subjectCode: 'P5',
    type: TaskType.MCQ,
    text: 'Who was the first Prime Minister of Pakistan?',
    choices: ['A: Quaid-e-Azam', 'B: Liaquat Ali Khan', 'C: Khawaja Nazimuddin', 'D: Ghulam Muhammad'],
    correctChoice: 'B',
    maxScore: 1
  },
  {
    id: 'm2',
    subjectCode: 'P3',
    type: TaskType.MCQ,
    text: 'Which is the largest organ in the human body?',
    choices: ['A: Liver', 'B: Heart', 'C: Skin', 'D: Lungs'],
    correctChoice: 'C',
    maxScore: 1
  },
  {
    id: 'm3',
    subjectCode: 'O1',
    type: TaskType.MCQ,
    text: ' The Treaty of Westphalia was signed in which year?',
    choices: ['A: 1648', 'B: 1789', 'C: 1919', 'D: 1945'],
    correctChoice: 'A',
    maxScore: 1
  },
  // Short Answers
  {
    id: 's1',
    subjectCode: 'P4',
    type: TaskType.SHORT_ANSWER,
    text: 'Briefly explain the impact of the 18th Amendment on provincial autonomy in Pakistan.',
    modelAnswer: [
      'Abolished the Concurrent List, transferring powers to provinces.',
      'Enhanced provincial financial autonomy via NFC Award.',
      'Removed President\'s power to dissolve assemblies unilaterally (Article 58-2(b)).',
      'Strengthened Council of Common Interests (CCI).'
    ],
    maxScore: 10
  },
  {
    id: 's2',
    subjectCode: 'P3',
    type: TaskType.SHORT_ANSWER,
    text: 'Differentiate between Renewable and Non-Renewable energy sources with examples.',
    modelAnswer: [
      'Renewable: Naturally replenished (Solar, Wind, Hydro).',
      'Non-Renewable: Finite resources (Coal, Oil, Natural Gas, Nuclear).',
      'Renewable has lower carbon footprint; Non-renewable usually high emissions.',
      'Sustainability factor differences.'
    ],
    maxScore: 10
  }
];

export const MOCK_USER_STATS: UserStats = {
  mcqsAttempted: 142,
  mcqAccuracy: 78,
  shortAnswersSubmitted: 12,
  averageShortScore: 6.5,
  recentActivity: [
    { date: 'Today', action: 'MCQ Practice - Pak Affairs', score: '8/10' },
    { date: 'Yesterday', action: 'Short Answer - Current Affairs', score: '7/10' },
    { date: '2 days ago', action: 'MCQ Practice - Science', score: '9/10' },
  ]
};
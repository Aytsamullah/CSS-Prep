
import React, { useState } from 'react';
import { TaskType, Question } from '../types';
import { generateMCQs } from '../services/geminiService';
import { COMPULSORY_SUBJECTS, OPTIONAL_SUBJECTS } from '../constants';
import { CheckCircle2, XCircle, AlertCircle, ArrowRight, RefreshCcw, Settings, Loader2, Trophy, BookOpen } from 'lucide-react';

const MCQPractice: React.FC = () => {
  const [mode, setMode] = useState<'setup' | 'loading' | 'quiz' | 'summary'>('setup');
  
  // Setup State
  const [subject, setSubject] = useState(COMPULSORY_SUBJECTS[0].name);
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  
  // Quiz State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleStartQuiz = async () => {
    setMode('loading');
    setError(null);
    try {
      const generatedQs = await generateMCQs(subject, difficulty, questionCount);
      setQuestions(generatedQs);
      // Reset quiz state
      setCurrentQIndex(0);
      setScore(0);
      setSelectedOption(null);
      setIsSubmitted(false);
      setMode('quiz');
    } catch (err) {
      console.error(err);
      setError("Failed to generate questions. Please check your connection or try a different subject.");
      setMode('setup');
    }
  };

  const handleSelect = (option: string) => {
    if (isSubmitted) return;
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    if (!selectedOption || isSubmitted) return;
    
    setIsSubmitted(true);
    const currentQuestion = questions[currentQIndex];
    const selectedLetter = selectedOption.charAt(0);
    
    if (selectedLetter === currentQuestion.correctChoice) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    } else {
      setMode('summary');
    }
  };

  const getOptionStyle = (option: string) => {
    const currentQuestion = questions[currentQIndex];
    const letter = option.charAt(0);
    const isSelected = selectedOption === option;
    const isCorrect = letter === currentQuestion.correctChoice;
    
    if (isSubmitted) {
      if (isCorrect) return 'bg-green-100 border-green-500 text-green-800 font-medium';
      if (isSelected && !isCorrect) return 'bg-red-100 border-red-500 text-red-800';
      return 'bg-white border-gray-200 opacity-60';
    }

    if (isSelected) return 'bg-green-50 border-green-500 text-green-900 shadow-sm font-medium';
    return 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700';
  };

  // --- RENDER: SETUP MODE ---
  if (mode === 'setup') {
    const allSubjects = [...COMPULSORY_SUBJECTS, ...OPTIONAL_SUBJECTS];
    
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MCQ Practice Zone</h1>
          <p className="text-gray-500">Customize your drill. AI will generate unique questions based on your syllabus.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Settings Card */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
            <div className="flex items-center gap-2 text-green-800 font-bold border-b border-gray-100 pb-4">
              <Settings size={20} /> Configuration
            </div>

            {/* Subject Select */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
              <select 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
              >
                <optgroup label="Compulsory">
                  {COMPULSORY_SUBJECTS.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                </optgroup>
                <optgroup label="Optional">
                  {OPTIONAL_SUBJECTS.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                </optgroup>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty Level</label>
              <div className="grid grid-cols-3 gap-2">
                {['Easy', 'Medium', 'Hard'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setDifficulty(lvl)}
                    className={`py-2 rounded-lg text-sm font-medium transition-all border ${
                      difficulty === lvl 
                        ? 'bg-green-700 text-white border-green-700 shadow-md' 
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Questions</label>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <input 
                  type="range" 
                  min="5" 
                  max="20" 
                  step="5" 
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-green-700"
                />
                <span className="font-bold text-gray-900 min-w-[3rem] text-center">{questionCount}</span>
              </div>
            </div>

            <button 
              onClick={handleStartQuiz}
              className="w-full py-4 bg-green-700 text-white rounded-xl font-bold text-lg hover:bg-green-800 transition-transform active:scale-[0.98] shadow-lg shadow-green-700/20"
            >
              Start Quiz
            </button>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-8 rounded-2xl border border-green-200 flex flex-col justify-center items-center text-center space-y-4">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-2">
                <BookOpen className="text-green-600" size={32} />
             </div>
             <h3 className="text-xl font-bold text-green-900">Why Practice MCQs?</h3>
             <p className="text-green-800 opacity-80 leading-relaxed">
               Objective sections account for a significant portion of marks in Compulsory subjects like Pakistan Affairs and General Science. Consistent practice improves retention and speed.
             </p>
             <div className="mt-4 flex gap-2">
                <span className="bg-white/60 px-3 py-1 rounded-full text-xs font-semibold text-green-800">Dynamic Content</span>
                <span className="bg-white/60 px-3 py-1 rounded-full text-xs font-semibold text-green-800">Instant Feedback</span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: LOADING MODE ---
  if (mode === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 size={64} className="text-green-600 animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Quiz...</h2>
        <p className="text-gray-500 max-w-md text-center">
          AI is crafting {questionCount} unique {difficulty} level questions for {subject}. This might take a few seconds.
        </p>
      </div>
    );
  }

  // --- RENDER: SUMMARY MODE ---
  if (mode === 'summary') {
    const percentage = Math.round((score / questions.length) * 100);
    let feedback = "";
    if (percentage >= 80) feedback = "Excellent! You have a strong command of this topic.";
    else if (percentage >= 50) feedback = "Good effort. Review the incorrect answers to improve.";
    else feedback = "Keep practicing. Focus on the core concepts of this subject.";

    return (
      <div className="max-w-2xl mx-auto text-center animate-fade-in pt-10">
        <div className="mb-6 inline-block p-4 bg-green-100 rounded-full text-green-700 shadow-sm">
          <Trophy size={48} />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Quiz Complete!</h1>
        <p className="text-gray-500 mb-8">Here is how you performed in {subject}</p>

        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm mb-8">
          <div className="flex justify-center items-end gap-2 mb-2">
            <span className="text-6xl font-bold text-gray-900">{score}</span>
            <span className="text-2xl text-gray-400 font-medium mb-1">/ {questions.length}</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-4">
            <div 
              className={`h-full ${percentage >= 50 ? 'bg-green-600' : 'bg-orange-500'}`} 
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <p className="text-gray-700 font-medium">{feedback}</p>
        </div>

        <button 
          onClick={() => setMode('setup')}
          className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 mx-auto"
        >
          <RefreshCcw size={18} /> Start New Quiz
        </button>
      </div>
    );
  }

  // --- RENDER: QUIZ MODE ---
  const currentQuestion = questions[currentQIndex];
  const progress = ((currentQIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
           <h1 className="text-xl font-bold text-gray-900">{subject}</h1>
           <p className="text-sm text-gray-500">{difficulty} Difficulty</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 font-mono text-sm font-bold text-green-800">
          Score: {score}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-1.5 absolute top-0 left-0">
          <div 
            className="bg-green-600 h-1.5 transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="p-8 pt-10">
          <div className="flex justify-between items-start mb-6">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Question {currentQIndex + 1} of {questions.length}
            </span>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-8 leading-relaxed">
            {currentQuestion.text}
          </h2>

          <div className="space-y-3">
            {currentQuestion.choices?.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(option)}
                disabled={isSubmitted}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${getOptionStyle(option)}`}
              >
                <span className="font-medium">{option}</span>
                {isSubmitted && option.charAt(0) === currentQuestion.correctChoice && (
                  <CheckCircle2 size={20} className="text-green-600" />
                )}
                {isSubmitted && selectedOption === option && option.charAt(0) !== currentQuestion.correctChoice && (
                  <XCircle size={20} className="text-red-600" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-8 flex justify-end h-12">
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedOption}
                className="bg-green-700 text-white px-8 rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Check Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="bg-gray-900 text-white px-8 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2 animate-fade-in"
              >
                {currentQIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'} 
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCQPractice;

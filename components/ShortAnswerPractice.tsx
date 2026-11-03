
import React, { useState } from 'react';
import { COMPULSORY_SUBJECTS, OPTIONAL_SUBJECTS } from '../constants';
import { TaskType, Rubric, AIResponse, Question } from '../types';
import { evaluateAnswer, generateShortAnswerQuestions } from '../services/geminiService';
import { 
  Loader2, 
  Send, 
  AlertCircle, 
  ChevronRight, 
  RefreshCw, 
  ChevronLeft,
  FileText,
  BarChart2,
  Settings,
  PenTool,
  Edit3
} from 'lucide-react';

const ShortAnswerPractice: React.FC = () => {
  // State for Setup Mode
  const [mode, setMode] = useState<'setup' | 'loading' | 'practice'>('setup');
  const [subject, setSubject] = useState(COMPULSORY_SUBJECTS[0].name);
  const [difficulty, setDifficulty] = useState('Medium');
  const [count, setCount] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // State for Practice Mode
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartPractice = async () => {
    setMode('loading');
    setError(null);
    try {
      const generatedQs = await generateShortAnswerQuestions(subject, difficulty, count);
      setQuestions(generatedQs);
      setCurrentQIndex(0);
      setAnswer('');
      setEvaluation(null);
      setMode('practice');
    } catch (err) {
      console.error(err);
      setError("Failed to generate questions. Please check your connection or try a different subject.");
      setMode('setup');
    }
  };

  const currentQuestion = questions[currentQIndex];

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setAnswer('');
      setEvaluation(null);
      setError(null);
    } else {
      // Finished all questions, maybe go back to setup or summary
      setMode('setup');
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1);
      setAnswer('');
      setEvaluation(null);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    
    setLoading(true);
    setError(null);

    // Standard rubric for CSS Subjective
    const rubric: Rubric = {
      content: 40,
      structure: 20,
      facts: 20,
      language: 20
    };

    try {
      const result = await evaluateAnswer(currentQuestion, answer, rubric);
      setEvaluation(result);
    } catch (err) {
      console.error(err);
      setError("Failed to evaluate answer. Please try again or check your API key.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER: SETUP MODE ---
  if (mode === 'setup') {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Subjective Practice</h1>
          <p className="text-gray-500">Practice writing analytical answers for 20-mark questions. Evaluated by AI.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
            <div className="flex items-center gap-2 text-green-800 font-bold border-b border-gray-100 pb-4">
              <Settings size={20} /> Configure Session
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
                  min="1" 
                  max="5" 
                  step="1" 
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-green-700"
                />
                <span className="font-bold text-gray-900 min-w-[3rem] text-center">{count}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Recommended: 1-2 questions for deep practice.</p>
            </div>

            <button 
              onClick={handleStartPractice}
              className="w-full py-4 bg-green-700 text-white rounded-xl font-bold text-lg hover:bg-green-800 transition-transform active:scale-[0.98] shadow-lg shadow-green-700/20"
            >
              Start Writing
            </button>
        </div>
      </div>
    );
  }

  // --- RENDER: LOADING MODE ---
  if (mode === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 size={64} className="text-green-600 animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Preparing Questions...</h2>
        <p className="text-gray-500 max-w-md text-center">
          AI is generating {count} unique {difficulty} level subjective questions for {subject}.
        </p>
      </div>
    );
  }

  // --- RENDER: PRACTICE MODE ---
  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6 flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold text-gray-900">{subject}</h1>
            <p className="text-sm text-gray-500">Question {currentQIndex + 1} of {questions.length} • {difficulty}</p>
         </div>
         <button 
           onClick={() => setMode('setup')}
           className="text-sm text-gray-500 hover:text-green-700 underline"
         >
           Exit Practice
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Question & Input */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Question Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
             <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase tracking-wider">
                  20 Marks
                </span>
             </div>
             <h2 className="text-xl font-bold text-gray-900 leading-relaxed mb-4">
               {currentQuestion.text}
             </h2>

             {/* Navigation (Desktop) */}
             <div className="absolute top-1/2 -translate-y-1/2 -left-12 hidden xl:block">
                <button 
                  onClick={handlePrev}
                  disabled={currentQIndex === 0}
                  className="p-2 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-green-700 hover:border-green-300 disabled:opacity-30 disabled:hover:text-gray-400 transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
             </div>
             <div className="absolute top-1/2 -translate-y-1/2 -right-12 hidden xl:block">
                <button 
                  onClick={handleNext}
                  disabled={currentQIndex === questions.length - 1}
                  className="p-2 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-green-700 hover:border-green-300 disabled:opacity-30 disabled:hover:text-gray-400 transition-all"
                >
                  <ChevronRight size={24} />
                </button>
             </div>
          </div>

          {/* Input Area */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
               <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                 <FileText size={14} /> Your Answer
               </span>
               <span className={`text-xs font-medium ${answer.length > 500 ? 'text-orange-600' : 'text-gray-400'}`}>
                 {answer.length} chars
               </span>
            </div>
            <textarea
              autoFocus
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={loading || (!!evaluation)}
              placeholder="Type your answer here... Structure your response with arguments, facts, and analysis."
              className={`w-full h-80 p-6 resize-none outline-none leading-relaxed transition-all
                ${(loading || !!evaluation) 
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
                  : 'bg-white text-gray-800 focus:bg-green-50/10 focus:ring-2 focus:ring-green-100'
                }
              `}
            />
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
               {/* Mobile Nav */}
               <div className="flex gap-2 xl:hidden">
                  <button 
                    onClick={handlePrev}
                    disabled={currentQIndex === 0 || loading}
                    className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg disabled:opacity-30"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={handleNext}
                    disabled={currentQIndex === questions.length - 1 || loading}
                    className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg disabled:opacity-30"
                  >
                    <ChevronRight size={20} />
                  </button>
               </div>

               {evaluation ? (
                 <button
                   onClick={() => {
                     // Keep existing answer for editing
                     setEvaluation(null);
                   }}
                   className="flex items-center gap-2 px-6 py-2 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors ml-auto shadow-md"
                 >
                   <Edit3 size={18} /> Edit & Improve
                 </button>
               ) : (
                 <button
                   onClick={handleSubmit}
                   disabled={loading || !answer.trim()}
                   className="flex items-center gap-2 px-8 py-2 bg-green-700 text-white rounded-lg font-bold hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-green-700/20 ml-auto"
                 >
                   {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                   Submit Answer
                 </button>
               )}
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Feedback */}
        <div className="lg:col-span-1">
          {evaluation ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-slide-up sticky top-6">
              <div className="bg-green-50 p-6 border-b border-green-100 text-center">
                <span className="text-sm font-bold text-green-800 uppercase tracking-wide">AI Evaluation Score</span>
                <div className="flex justify-center items-end gap-1 mt-2">
                   <span className="text-5xl font-bold text-green-700">{evaluation.score}</span>
                   <span className="text-xl text-green-600/60 font-medium mb-1">/ {evaluation.max_score}</span>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Breakdown */}
                <div>
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                     <BarChart2 size={14} /> Score Breakdown
                   </h3>
                   <div className="space-y-3">
                     {Object.entries(evaluation.breakdown).map(([key, value]) => (
                       <div key={key}>
                         <div className="flex justify-between text-sm mb-1">
                           <span className="capitalize text-gray-600">{key}</span>
                           <span className="font-bold text-gray-900">{value}%</span>
                         </div>
                         <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                           <div 
                             className="bg-green-600 h-full rounded-full" 
                             style={{ width: `${value}%` }}
                           ></div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Feedback */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Feedback</h3>
                  <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {evaluation.feedback}
                  </p>
                </div>

                {/* Explanation */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Model Key Points</h3>
                  <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1">
                     {currentQuestion.modelAnswer?.map((point, i) => (
                       <li key={i}>{point}</li>
                     ))}
                  </ul>
                  <p className="text-gray-600 text-xs leading-relaxed mt-2 border-t pt-2 border-dashed">
                    {evaluation.explanation}
                  </p>
                </div>

                {evaluation.plagiarism_flag && (
                  <div className="bg-orange-50 text-orange-800 text-xs p-3 rounded-lg border border-orange-100 flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p>High similarity to model answer detected. Try to rephrase in your own words.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 text-center flex flex-col justify-center items-center opacity-70 sticky top-6 min-h-[300px]">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <BarChart2 className="text-gray-400" size={32} />
               </div>
               <h3 className="text-gray-900 font-bold mb-1">Awaiting Submission</h3>
               <p className="text-sm text-gray-500">
                 Submit your answer to receive detailed AI feedback and scoring.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShortAnswerPractice;

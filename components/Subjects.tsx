import React, { useState } from 'react';
import { COMPULSORY_SUBJECTS, OPTIONAL_SUBJECTS } from '../constants';
import { Book, Check } from 'lucide-react';

const Subjects: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'compulsory' | 'optional'>('compulsory');

  const subjects = activeTab === 'compulsory' ? COMPULSORY_SUBJECTS : OPTIONAL_SUBJECTS;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Subjects Syllabus</h1>
        <p className="text-gray-600">Review compulsory and optional subjects as per FPSC.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 rounded-xl bg-gray-200 p-1 mb-6 max-w-md">
        <button
          onClick={() => setActiveTab('compulsory')}
          className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
            ${activeTab === 'compulsory' 
              ? 'bg-white text-green-700 shadow' 
              : 'text-gray-600 hover:bg-white/[0.12] hover:text-gray-800'}`
          }
        >
          Compulsory (600 Marks)
        </button>
        <button
          onClick={() => setActiveTab('optional')}
          className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
            ${activeTab === 'optional' 
              ? 'bg-white text-green-700 shadow' 
              : 'text-gray-600 hover:bg-white/[0.12] hover:text-gray-800'}`
          }
        >
          Optional (Groups)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <div key={subject.code} className="bg-white border border-gray-200 rounded-xl p-6 hover:border-green-300 hover:shadow-md transition-all group cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-green-100 text-green-700 font-bold p-2 rounded-lg">
                <Book size={20} />
              </div>
              <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {subject.marks} Marks
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-green-700 transition-colors">
              {subject.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Code: {subject.code} {subject.group ? `• Group ${subject.group}` : ''}
            </p>

            <div className="flex gap-2 text-sm text-green-600 font-medium items-center mt-auto pt-4 border-t border-gray-50">
               <Check size={16} /> 2 Practice Sets Available
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Subjects;
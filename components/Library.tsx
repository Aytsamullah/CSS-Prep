
import React, { useState } from 'react';
import { BookResource } from '../types';
import { findBooksForSubject } from '../services/geminiService';
import { Search, Book, ExternalLink, Loader2, Download, Library as LibraryIcon, AlertCircle, Globe } from 'lucide-react';
import { COMPULSORY_SUBJECTS } from '../constants';

const Library: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [books, setBooks] = useState<BookResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!subject.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setBooks([]);

    try {
      const results = await findBooksForSubject(subject);
      setBooks(results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const quickSearch = (subjName: string) => {
    setSubject(subjName);
    setLoading(true);
    setHasSearched(true);
    setBooks([]);
    
    findBooksForSubject(subjName)
      .then(results => setBooks(results))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-5xl mx-auto min-h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <LibraryIcon className="text-green-700" size={32} />
          Digital Library
        </h1>
        <p className="text-gray-500 mt-2">
          Discover high-quality, authentic study resources and books for CSS preparation.
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter a subject (e.g., 'History of USA', 'Islamic Studies')"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !subject.trim()}
            className="bg-green-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-800 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Find Books'}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Quick Access:</span>
          {COMPULSORY_SUBJECTS.slice(0, 4).map(sub => (
            <button
              key={sub.code}
              onClick={() => quickSearch(sub.name)}
              disabled={loading}
              className="px-3 py-1 bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-600 text-xs rounded-full border border-gray-200 transition-colors"
            >
              {sub.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Loader2 size={40} className="animate-spin text-green-600 mb-4" />
            <p className="text-gray-600 font-medium">Scanning reliable sources...</p>
            <p className="text-sm text-gray-400">Locating authentic books for {subject}</p>
          </div>
        ) : hasSearched && books.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
            <AlertCircle size={40} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-bold text-gray-700">No resources found</h3>
            <p className="text-gray-500">Try refining your search term or checking the subject name.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {books.map((book, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col hover:shadow-lg transition-shadow group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Book size={60} />
                </div>
                
                <div className="flex justify-between items-start mb-2">
                   <span className={`text-xs font-bold px-2 py-1 rounded border ${
                     book.type === 'PDF' 
                      ? 'bg-red-50 text-red-700 border-red-100' 
                      : 'bg-blue-50 text-blue-700 border-blue-100'
                   }`}>
                     {book.type}
                   </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1 pr-8 line-clamp-2 leading-tight">
                  {book.title}
                </h3>
                <p className="text-sm text-green-700 font-medium mb-3">{book.author}</p>
                
                <p className="text-sm text-gray-600 mb-6 line-clamp-3 flex-grow">
                  {book.description}
                </p>

                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-3">
                  <a 
                    href={book.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-700 hover:bg-green-800 px-4 py-2 rounded-lg transition-colors"
                  >
                    {book.type === 'PDF' ? <Download size={18} /> : <Globe size={18} />}
                    {book.type === 'PDF' ? 'Download PDF' : 'Visit Website'}
                  </a>
                  <a 
                    href={book.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-lg border border-gray-200 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasSearched && (
          <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
             <LibraryIcon size={64} className="text-gray-300 mb-4" />
             <p className="text-gray-500">Search for a subject above to find study materials.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;

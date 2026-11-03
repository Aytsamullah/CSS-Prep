import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Loader2, Newspaper, Clock, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { fetchNewsBriefing } from '../services/geminiService';
import { GroundingChunk, NewsItem } from '../types';

const Dashboard: React.FC = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const loadNews = async (forceRefresh = false) => {
    try {
      setLoadingNews(true);
      setNewsError(null);
      const data = await fetchNewsBriefing(forceRefresh);
      setNewsItems(data.newsItems || []);
      setGroundingChunks(data.groundingChunks || []);
      setQuotaExceeded(Boolean(data.quotaExceeded));
    } catch (err: any) {
      setNewsError(err.message || 'Unable to load latest headlines. Please check your connection.');
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const getCategoryColor = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('politics')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (c.includes('economy')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (c.includes('international')) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Briefing</h1>
          <p className="text-gray-500 mt-1">
            Top developments relevant to your CSS preparation, curated for CSS aspirants.
          </p>
        </div>
        <button 
          onClick={() => loadNews(true)} 
          disabled={loadingNews}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {loadingNews ? <Loader2 size={16} className="animate-spin text-green-600" /> : <RefreshCw size={16} />}
          Refresh News
        </button>
      </div>

      {/* Quota Exceeded Informational Notice */}
      {quotaExceeded && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Free tier API search quota limit reached.</span> Showing curated CSS current affairs briefing. To increase your live search quota, you can attach a billing-enabled API key in the <strong>Settings &gt; Secrets</strong> panel.
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6">
        {loadingNews ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
            <Loader2 size={40} className="animate-spin text-green-600 mb-4" />
            <p className="text-gray-500 font-medium">Curating daily briefing...</p>
            <p className="text-sm text-gray-400">Reviewing reliable sources for Pakistan Affairs & Economy</p>
          </div>
        ) : newsError ? (
          <div className="p-8 bg-red-50 border border-red-100 rounded-xl text-center">
            <AlertCircle size={28} className="text-red-500 mx-auto mb-2" />
            <p className="text-red-600 font-medium mb-2">{newsError}</p>
            <button onClick={() => loadNews(true)} className="text-sm text-red-700 underline font-medium cursor-pointer">
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* News Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newsItems.map((item, idx) => (
                <div key={item.id || idx} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-green-200 transition-all duration-300 flex flex-col group">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={12} /> {item.date}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-3 leading-snug group-hover:text-green-800 transition-colors">
                    {item.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-6 flex-grow leading-relaxed">
                    {item.summary}
                  </p>
                  
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium text-gray-700 flex items-center gap-1">
                      <Newspaper size={14} /> {item.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sources / Grounding */}
            {groundingChunks.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                   <ExternalLink size={14} /> Verified Sources
                </h4>
                <div className="flex flex-wrap gap-2">
                  {groundingChunks.map((chunk, idx) => chunk.web ? (
                    <a 
                      key={idx}
                      href={chunk.web.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-white text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:border-green-300 hover:text-green-700 transition-colors max-w-[250px] truncate shadow-sm"
                      title={chunk.web.title}
                    >
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${new URL(chunk.web.uri).hostname}`} 
                        alt="" 
                        className="w-3 h-3 opacity-70"
                      />
                      <span className="truncate">{chunk.web.title}</span>
                    </a>
                  ) : null)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Action Footer */}
      <div className="mt-8 bg-gradient-to-r from-green-800 to-green-900 rounded-xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg">
        <div>
          <h2 className="text-xl font-bold mb-1">Ready to test your knowledge?</h2>
          <p className="text-green-100 text-sm">Apply today's current affairs in a short essay.</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Link 
            to="/practice/short" 
            className="bg-white text-green-800 px-5 py-2.5 rounded-lg font-bold hover:bg-green-50 transition-colors text-sm"
          >
            Practice Essay
          </Link>
          <Link 
            to="/practice/mcq" 
            className="bg-green-700 text-white border border-green-600 px-5 py-2.5 rounded-lg font-bold hover:bg-green-600 transition-colors text-sm"
          >
            Quick MCQ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
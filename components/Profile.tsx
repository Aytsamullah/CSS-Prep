import React from 'react';
import { MOCK_USER_STATS } from '../constants';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Award, Target, BookOpen, Clock } from 'lucide-react';

const Profile: React.FC = () => {
  // Mock data for chart
  const data = [
    { name: 'Mon', score: 40 },
    { name: 'Tue', score: 65 },
    { name: 'Wed', score: 55 },
    { name: 'Thu', score: 80 },
    { name: 'Fri', score: 75 },
    { name: 'Sat', score: 90 },
    { name: 'Sun', score: 85 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-2xl font-bold">
          JD
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">John Doe</h1>
          <p className="text-gray-500">CSS 2025 Aspirant • Islamabad Center</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Target size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">MCQs Done</p>
            <p className="text-2xl font-bold text-gray-900">{MOCK_USER_STATS.mcqsAttempted}</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Award size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Accuracy</p>
            <p className="text-2xl font-bold text-gray-900">{MOCK_USER_STATS.mcqAccuracy}%</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Essays</p>
            <p className="text-2xl font-bold text-gray-900">{MOCK_USER_STATS.shortAnswersSubmitted}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Study Streak</p>
            <p className="text-2xl font-bold text-gray-900">12 Days</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-6">Weekly Performance</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#15803d" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#15803d" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip 
                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
              />
              <Area type="monotone" dataKey="score" stroke="#15803d" fillOpacity={1} fill="url(#colorScore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">Recent Activity</h3>
        <div className="divide-y divide-gray-100">
          {MOCK_USER_STATS.recentActivity.map((activity, idx) => (
            <div key={idx} className="py-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-500">{activity.date}</p>
              </div>
              <span className="text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                {activity.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;

import React from 'react';
import { User, PerformanceFeedback } from '../types';

const PerformancePage: React.FC<{ user: User }> = ({ user }) => {
  const mockFeedback: PerformanceFeedback[] = [
    { id: '1', fromId: '2', fromName: 'James Wilson', content: "Great handling of the Q3 infrastructure migration. Very disciplined approach to documentation.", date: '2024-05-10', category: 'manager', rating: 5 },
    { id: '2', fromId: '3', fromName: 'Emily Davis', content: "Sarah is always helpful when I'm stuck on frontend tasks. A real team player.", date: '2024-05-15', category: 'peer', rating: 4 },
  ];

  const skillRatings = [
    { label: 'Technical Proficiency', score: 92 },
    { label: 'Communication', score: 85 },
    { label: 'Teamwork', score: 95 },
    { label: 'Adaptability', score: 78 },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Performance & Growth</h1>
          <p className="text-slate-500">Continuous feedback and career progression tracking.</p>
        </div>
        <button className="bg-white border border-slate-200 px-6 py-2 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 text-sm shadow-sm">
          <i className="fas fa-pen-nib"></i>
          Request Feedback
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {skillRatings.map((skill, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="relative w-24 h-24 flex items-center justify-center mb-4">
              <svg className="w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-50" />
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251} strokeDashoffset={251 - (251 * skill.score) / 100} className="text-indigo-600" />
              </svg>
              <span className="absolute text-sm font-black text-slate-800">{skill.score}%</span>
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">{skill.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-2">Recent Feedback</h3>
          <div className="space-y-4">
            {mockFeedback.map(f => (
              <div key={f.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-indigo-600">{f.fromName.charAt(0)}</div>
                    <div>
                      <h4 className="font-bold text-slate-800">{f.fromName}</h4>
                      <p className="text-[10px] text-slate-400 uppercase font-black">{f.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <i key={star} className={`fas fa-star text-[10px] ${star <= f.rating ? 'text-amber-400' : 'text-slate-100'}`}></i>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 italic leading-relaxed">"{f.content}"</p>
                <p className="text-[10px] text-slate-400 mt-4 font-medium">{new Date(f.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-2">Quick Wins</h3>
          <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
              <i className="fas fa-trophy text-amber-400"></i>
            </div>
            <h4 className="text-lg font-bold mb-2">Quarterly MVP Candidate</h4>
            <p className="text-xs text-indigo-200 leading-relaxed mb-6">Your performance scores are in the top 5% of your department this quarter. Keep it up!</p>
            <button className="w-full py-3 bg-white text-indigo-900 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-50 transition-all">View Full Report</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformancePage;

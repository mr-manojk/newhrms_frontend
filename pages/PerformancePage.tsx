
import React, { useState, useMemo } from 'react';
import { User, PerformanceFeedback, Goal, GoalStatus, GoalPriority, PerformanceReview, UserRole } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';
import ModalPortal from '../components/ModalPortal';

type ActiveTab = 'overview' | 'goals' | 'reviews' | 'feedback';

interface PerformancePageProps {
  user: User;
  employees: User[];
  goals: Goal[];
  reviews: PerformanceReview[];
  feedback: PerformanceFeedback[];
  onAddGoal: (goal: Partial<Goal>) => Promise<void>;
  onAddFeedback: (fb: Partial<PerformanceFeedback>) => Promise<void>;
  onAddReview: (review: Partial<PerformanceReview>) => Promise<void>;
}

const PerformancePage: React.FC<PerformancePageProps> = ({ user, employees, goals, reviews, feedback, onAddGoal, onAddFeedback, onAddReview }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  const userGoals = useMemo(() => goals.filter(g => String(g.userId) === String(user.id)), [goals, user.id]);
  const userFeedback = useMemo(() => feedback.filter(f => String(f.userId) === String(user.id)), [feedback, user.id]);
  const userReviews = useMemo(() => reviews.filter(r => String(r.userId) === String(user.id)), [reviews, user.id]);

  const skillRatings = [
    { label: 'Technical Proficiency', score: 92, color: 'text-emerald-600' },
    { label: 'Communication', score: 85, color: 'text-indigo-600' },
    { label: 'Teamwork', score: 95, color: 'text-primary-600' },
    { label: 'Adaptability', score: 78, color: 'text-amber-600' },
  ];

  const renderTabButton = (id: ActiveTab, label: string, icon: string) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
        activeTab === id 
          ? 'border-primary-600 text-primary-600 bg-primary-50/30' 
          : 'border-transparent text-slate-400 hover:text-slate-600'
      }`}
    >
      <i className={`fas ${icon}`}></i>
      {label}
    </button>
  );

  const getStatusColor = (status: GoalStatus) => {
    switch (status) {
      case GoalStatus.ON_TRACK: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case GoalStatus.BEHIND: return 'bg-amber-50 text-amber-600 border-amber-100';
      case GoalStatus.AT_RISK: return 'bg-rose-50 text-rose-600 border-rose-100';
      case GoalStatus.COMPLETED: return 'bg-primary-50 text-primary-600 border-primary-100';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  const getPriorityColor = (priority: GoalPriority) => {
    switch (priority) {
      case GoalPriority.HIGH: return 'bg-rose-500';
      case GoalPriority.MEDIUM: return 'bg-amber-500';
      case GoalPriority.LOW: return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  const overallProgress = useMemo(() => {
    if (userGoals.length === 0) return 0;
    return Math.round(userGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / userGoals.length);
  }, [userGoals]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Performance Hub</h1>
          <p className="text-slate-500 font-medium">Strategic alignment and professional growth tracking.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowGoalModal(true)} className="bg-white border border-slate-200 px-6 py-2.5 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 text-sm shadow-sm">
            <i className="fas fa-plus"></i> New Goal
          </button>
          <button onClick={() => setShowReviewModal(true)} className="bg-primary-600 text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-primary-700 transition-all flex items-center gap-2 text-sm shadow-lg shadow-primary-100">
            <i className="fas fa-bullseye"></i> Request Review
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6 flex overflow-x-auto no-scrollbar px-2">
        {renderTabButton('overview', 'Analytics', 'fa-chart-pie')}
        {renderTabButton('goals', 'Objectives & OKRs', 'fa-bullseye')}
        {renderTabButton('reviews', 'Appraisals', 'fa-file-signature')}
        {renderTabButton('feedback', '360° Feedback', 'fa-comments')}
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {skillRatings.map((skill, idx) => (
                <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center group hover:border-primary-200 transition-all">
                  <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-50" />
                      <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={301} strokeDashoffset={301 - (301 * skill.score) / 100} className={`${skill.color} transition-all duration-1000`} />
                    </svg>
                    <span className="absolute text-lg font-black text-slate-800">{skill.score}%</span>
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">{skill.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Goal Progress Matrix</h3>
                  <span className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">Overall: {overallProgress}% Complete</span>
                </div>
                <div className="space-y-6">
                  {userGoals.length > 0 ? userGoals.map(goal => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-slate-700">{goal.title}</span>
                        <span className="text-slate-400">{goal.progress}%</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-100 ${goal.progress > 70 ? 'bg-emerald-500' : goal.progress > 30 ? 'bg-primary-500' : 'bg-amber-500'}`} 
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 text-slate-400 italic text-sm">No goals assigned yet.</div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                    <i className="fas fa-award text-amber-400 text-xl"></i>
                  </div>
                  <h4 className="text-2xl font-black mb-2">Quarterly Outlook</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">You're currently in a high growth phase. Tracking your OKRs weekly will help you stay aligned with department KPIs.</p>
                </div>
                <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Focus Area</p>
                   <p className="text-xs font-bold text-primary-400">Leadership & Innovation</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="grid grid-cols-1 gap-6">
            {userGoals.length > 0 ? userGoals.map(goal => (
              <div key={goal.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-8 items-center">
                <div className="w-full md:w-24 shrink-0 flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg shadow-lg ${getPriorityColor(goal.priority)}`}>
                    <i className="fas fa-flag"></i>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest mt-2 text-slate-400">{goal.priority} Priority</span>
                </div>
                
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <h3 className="text-xl font-bold text-slate-800">{goal.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">{goal.description}</p>
                  <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(goal.status)}`}>
                      {(goal.status || 'ON_TRACK').replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due: {goal.dueDate}</span>
                  </div>
                </div>

                <div className="w-full md:w-48 space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                    <span className="text-lg font-black text-slate-800">{goal.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-600 transition-all duration-1000" style={{ width: `${goal.progress}%` }}></div>
                  </div>
                </div>
              </div>
            )) : (
               <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                  <i className="fas fa-bullseye text-4xl text-slate-200 mb-4"></i>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No objectives set for this cycle</p>
               </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-6 tracking-tight">Review Lifecycle</h3>
                <div className="space-y-4">
                  {userReviews.length > 0 ? userReviews.map(review => (
                    <div key={review.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white hover:border-primary-100 transition-all cursor-pointer group">
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl ${review.status === 'FINALIZED' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'} shadow-lg shadow-black/5`}>
                          <i className={`fas ${review.status === 'FINALIZED' ? 'fa-check-double' : 'fa-pen-nib'}`}></i>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg">{review.cycle}</h4>
                          <p className="text-xs text-slate-500 font-medium">Last Modified: {review.lastUpdated}</p>
                        </div>
                      </div>

                      <div className="flex gap-8">
                        <div className="text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Self Rating</p>
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(s => <i key={s} className={`fas fa-star text-[10px] ${s <= (review.selfRating || 0) ? 'text-amber-400' : 'text-slate-200'}`}></i>)}
                          </div>
                        </div>
                        {review.managerRating && (
                          <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Manager Rating</p>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => <i key={s} className={`fas fa-star text-[10px] ${s <= review.managerRating! ? 'text-primary-500' : 'text-slate-200'}`}></i>)}
                            </div>
                          </div>
                        )}
                      </div>

                      <button className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:border-primary-600 hover:text-primary-600 transition-all">
                        {review.status === 'FINALIZED' ? 'View Report' : 'Continue Draft'}
                      </button>
                    </div>
                  )) : (
                    <div className="text-center py-10 text-slate-400 italic text-sm">No appraisal history available.</div>
                  )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userFeedback.length > 0 ? userFeedback.map(f => (
              <div key={f.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:border-primary-100 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-indigo-600 text-sm">
                        {f.fromName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{f.fromName}</h4>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{f.category}</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => <i key={s} className={`fas fa-star text-[8px] ${s <= (f.rating || 0) ? 'text-amber-400' : 'text-slate-100'}`}></i>)}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 italic leading-relaxed">"{f.content}"</p>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400">{f.date}</span>
                  <button className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline">Reply</button>
                </div>
              </div>
            )) : (
               <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                  <i className="fas fa-comment-slash text-4xl text-slate-200 mb-4"></i>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No feedback received yet</p>
               </div>
            )}
            
            <button onClick={() => setShowFeedbackModal(true)} className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-8 group hover:border-primary-400 transition-all hover:bg-primary-50/10 h-full">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 mb-4 group-hover:text-primary-600 transition-colors">
                <i className="fas fa-plus"></i>
              </div>
              <p className="text-sm font-bold text-slate-500 group-hover:text-primary-600">Give Feedback</p>
              <p className="text-[10px] text-slate-400 mt-1">Recognize a colleague's work</p>
            </button>
          </div>
        )}
      </div>

      <ModalPortal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)}>
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in duration-200">
          <h3 className="text-2xl font-black text-slate-800 mb-6">Create Objective</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const target = e.target as any;
            await onAddGoal({
                title: target.title.value,
                description: target.description.value,
                dueDate: target.dueDate.value,
                priority: target.priority.value,
                progress: 0,
                status: GoalStatus.ON_TRACK
            });
            setShowGoalModal(false);
          }} className="space-y-4">
            <input name="title" required placeholder="Goal Title" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
            <textarea name="description" placeholder="Short description..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none min-h-[100px]" />
            <div className="grid grid-cols-2 gap-4">
              <input name="dueDate" type="date" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
              <select name="priority" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                  <option value={GoalPriority.MEDIUM}>Medium</option>
                  <option value={GoalPriority.HIGH}>High</option>
                  <option value={GoalPriority.LOW}>Low</option>
              </select>
            </div>
            <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowGoalModal(false)} className="flex-1 font-bold text-slate-400">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl">Save Goal</button>
            </div>
          </form>
        </div>
      </ModalPortal>

      <ModalPortal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)}>
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in duration-200">
          <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-6 text-2xl shadow-lg shadow-primary-50">
            <i className="fas fa-bullseye"></i>
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Initiate Appraisal</h3>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">Request a formal performance evaluation from your manager or a designated lead.</p>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            const target = e.target as any;
            await onAddReview({
                reviewerId: target.reviewer.value,
                cycle: target.cycle.value
            });
            setShowReviewModal(false);
          }} className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Review Cycle</label>
                <select name="cycle" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                  <option value="Annual Appraisal 2025">Annual Appraisal 2025</option>
                  <option value="Mid-Year Review 2025">Mid-Year Review 2025</option>
                  <option value="Quarterly Check-in Q1">Quarterly Check-in Q1</option>
                  <option value="Probation Review">Probation Review</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Reviewer</label>
                <select name="reviewer" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                  <option value="">Select Reviewer</option>
                  {employees.filter(e => e.id !== user.id && (e.role === UserRole.MANAGER || e.role === UserRole.HR || e.role === UserRole.ADMIN)).map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.jobTitle})</option>
                  ))}
                </select>
            </div>

            <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowReviewModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-primary-100">Send Request</button>
            </div>
          </form>
        </div>
      </ModalPortal>

      <ModalPortal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)}>
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in duration-200">
          <h3 className="text-2xl font-black text-slate-800 mb-6">Send Feedback</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const target = e.target as any;
            await onAddFeedback({
                userId: target.recipient.value,
                content: target.content.value,
                rating: parseInt(target.rating.value),
                category: 'peer'
            });
            setShowFeedbackModal(false);
          }} className="space-y-4">
            <select name="recipient" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                <option value="">Select Recipient</option>
                {employees.filter(e => e.id !== user.id).map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
            </select>
            <textarea name="content" required placeholder="Write your feedback..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none min-h-[100px]" />
            <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rating</span>
                <select name="rating" className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                  <option value="5">5 - Exceptional</option>
                  <option value="4">4 - Great</option>
                  <option value="3">3 - Good</option>
                  <option value="2">2 - Improving</option>
                  <option value="1">1 - Needs Attention</option>
                </select>
            </div>
            <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowFeedbackModal(false)} className="flex-1 font-bold text-slate-400">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl">Send Recognition</button>
            </div>
          </form>
        </div>
      </ModalPortal>
    </div>
  );
};

export default PerformancePage;
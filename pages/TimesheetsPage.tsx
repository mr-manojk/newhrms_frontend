
import React, { useState, useMemo } from 'react';
import { User, Project, TimesheetEntry, TimesheetPeriod, TimesheetStatus } from '../types';

interface TimesheetsPageProps {
  user: User;
  projects: Project[];
  entries: TimesheetEntry[];
  periods: TimesheetPeriod[];
  onSave: (entries: TimesheetEntry[], period: TimesheetPeriod) => void;
}

const TimesheetsPage: React.FC<TimesheetsPageProps> = ({ user, projects, entries, periods, onSave }) => {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  const weekDays = useMemo(() => {
    const days = [];
    const start = new Date(selectedWeek);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({
        date: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        day: d.getDate()
      });
    }
    return days;
  }, [selectedWeek]);

  const currentPeriod = useMemo(() => {
    return periods.find(p => p.userId === user.id && p.startDate === selectedWeek) || {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      startDate: selectedWeek,
      status: TimesheetStatus.DRAFT
    };
  }, [periods, user.id, selectedWeek]);

  const [localEntries, setLocalEntries] = useState<TimesheetEntry[]>(() => 
    entries.filter(e => e.userId === user.id && weekDays.some(wd => wd.date === e.date))
  );

  const [activeProjectId, setActiveProjectId] = useState<string>(projects[0]?.id || '');

  // Update local entries when week changes
  React.useEffect(() => {
     setLocalEntries(entries.filter(e => e.userId === user.id && weekDays.some(wd => wd.date === e.date)));
  }, [selectedWeek, entries, user.id]);

  const handleHourChange = (date: string, projectId: string, hours: number) => {
    if (currentPeriod.status !== TimesheetStatus.DRAFT) return;
    const newEntries = [...localEntries];
    const idx = newEntries.findIndex(e => e.date === date && e.projectId === projectId);
    
    if (idx !== -1) {
      if (hours <= 0) newEntries.splice(idx, 1);
      else newEntries[idx].hours = Math.min(24, hours);
    } else if (hours > 0) {
      newEntries.push({
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        projectId,
        date,
        hours: Math.min(24, hours)
      });
    }
    setLocalEntries(newEntries);
  };

  const getHours = (date: string, projectId: string) => {
    return localEntries.find(e => e.date === date && e.projectId === projectId)?.hours || 0;
  };

  const getDayTotal = (date: string) => {
    return localEntries.filter(e => e.date === date).reduce((sum, e) => sum + e.hours, 0);
  };

  const weekTotal = useMemo(() => localEntries.reduce((sum, e) => sum + e.hours, 0), [localEntries]);

  const changeWeek = (offset: number) => {
    const d = new Date(selectedWeek);
    d.setDate(d.getDate() + offset * 7);
    setSelectedWeek(d.toISOString().split('T')[0]);
  };

  const handleSubmit = (status: TimesheetStatus) => {
    onSave(localEntries, { ...currentPeriod, status, submittedAt: new Date().toISOString() });
  };

  const isReadOnly = currentPeriod.status !== TimesheetStatus.DRAFT;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekly Timesheet</h1>
          <p className="text-sm text-slate-500">Record your working hours per project.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center shadow-sm">
            <button onClick={() => changeWeek(-1)} className="w-8 h-8 rounded-lg hover:bg-slate-50 text-slate-500 transition-all"><i className="fas fa-chevron-left"></i></button>
            <span className="px-4 text-xs font-bold text-slate-700 whitespace-nowrap">
              {new Date(selectedWeek).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(weekDays[6].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button onClick={() => changeWeek(1)} className="w-8 h-8 rounded-lg hover:bg-slate-50 text-slate-500 transition-all"><i className="fas fa-chevron-right"></i></button>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
            currentPeriod.status === TimesheetStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
            currentPeriod.status === TimesheetStatus.SUBMITTED ? 'bg-amber-50 text-amber-600 border-amber-100' :
            'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
            {currentPeriod.status}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-64">Project / Task</th>
                {weekDays.map(wd => (
                  <th key={wd.date} className="p-4 text-center min-w-[100px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{wd.label}</p>
                    <p className="text-sm font-black text-slate-800 mt-1">{wd.day}</p>
                  </th>
                ))}
                <th className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/50">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {projects.map(proj => {
                const projTotal = localEntries.filter(e => e.projectId === proj.id).reduce((sum, e) => sum + e.hours, 0);
                return (
                  <tr key={proj.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <p className="text-sm font-bold text-slate-800">{proj.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{proj.client}</p>
                    </td>
                    {weekDays.map(wd => (
                      <td key={wd.date} className="p-2">
                        <input 
                          type="number" 
                          min="0" 
                          max="24"
                          step="0.5"
                          disabled={isReadOnly}
                          value={getHours(wd.date, proj.id) || ''}
                          onChange={(e) => handleHourChange(wd.date, proj.id, parseFloat(e.target.value) || 0)}
                          className="w-full p-3 bg-white border border-slate-100 rounded-2xl text-center text-sm font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all outline-none disabled:bg-transparent disabled:border-transparent disabled:text-slate-400"
                          placeholder="-"
                        />
                      </td>
                    ))}
                    <td className="p-2 bg-slate-50/30 text-center text-sm font-black text-slate-800">
                      {projTotal > 0 ? projTotal : '-'}
                    </td>
                  </tr>
                );
              })}
              {/* Daily Totals Row */}
              <tr className="bg-indigo-50/30 border-t border-indigo-100">
                <td className="p-6">
                  <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Daily Totals</span>
                </td>
                {weekDays.map(wd => (
                  <td key={wd.date} className="p-4 text-center">
                    <span className="text-sm font-black text-indigo-600">{getDayTotal(wd.date)}</span>
                  </td>
                ))}
                <td className="p-4 text-center bg-indigo-600 text-white font-black text-sm">
                  {weekTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
          <div className="flex gap-4">
             <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 flex flex-col items-center min-w-[120px]">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Weekly Total</span>
                <span className="text-xl font-black text-slate-800">{weekTotal} hrs</span>
             </div>
             <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 flex flex-col items-center min-w-[120px]">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Remaining</span>
                <span className="text-xl font-black text-slate-800">{Math.max(0, 40 - weekTotal)} hrs</span>
             </div>
          </div>

          <div className="flex gap-4">
             {!isReadOnly && (
               <>
                  <button 
                    onClick={() => handleSubmit(TimesheetStatus.DRAFT)}
                    className="px-6 py-3 text-slate-500 font-bold text-sm hover:text-slate-800 transition-all"
                  >
                    Save Draft
                  </button>
                  <button 
                    onClick={() => handleSubmit(TimesheetStatus.SUBMITTED)}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all transform active:scale-[0.98]"
                  >
                    Submit for Approval
                  </button>
               </>
             )}
             {currentPeriod.status === TimesheetStatus.SUBMITTED && (
               <p className="text-xs text-amber-600 font-bold italic flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-xl">
                 <i className="fas fa-info-circle"></i>
                 Awaiting manager review
               </p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetsPage;

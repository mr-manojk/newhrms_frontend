
import React, { useState, useMemo, useCallback } from 'react';
import { User, UserRole, RosterAssignment, ShiftTemplate } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';

interface RosterPageProps {
  currentUser: User;
  employees: User[];
  rosters: RosterAssignment[];
  onSave: (assignments: RosterAssignment[]) => Promise<void>;
}

const SHIFT_TEMPLATES: ShiftTemplate[] = [
  { id: 'off', name: 'Day Off', startTime: '--:--', endTime: '--:--', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  { id: 'gen', name: 'General', startTime: '10:00', endTime: '19:00', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { id: 'morn', name: 'Morning', startTime: '06:00', endTime: '15:00', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { id: 'eve', name: 'Evening', startTime: '14:00', endTime: '23:00', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'night', name: 'Night', startTime: '22:00', endTime: '07:00', color: 'bg-slate-900 text-white border-slate-800' },
];

const RosterPage: React.FC<RosterPageProps> = ({ currentUser, employees, rosters, onSave }) => {
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  const [filterDept, setFilterDept] = useState('All');
  const [localAssignments, setLocalAssignments] = useState<RosterAssignment[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSelector, setShowSelector] = useState<{ userId: string, date: string } | null>(null);

  const weekDays = useMemo(() => {
    const days = [];
    const start = new Date(selectedWeekStart);
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
  }, [selectedWeekStart]);

  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return ['All', ...Array.from(depts)].sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    // If Manager, only show their team
    let list = employees;
    if (currentUser.role === UserRole.MANAGER) {
      list = employees.filter(e => e.managerId === currentUser.id);
    }
    if (filterDept !== 'All') {
      list = list.filter(e => e.department === filterDept);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, filterDept, currentUser]);

  const getShift = useCallback((userId: string, date: string) => {
    // Check local changes first
    const local = localAssignments.find(a => a.userId === userId && a.date === date);
    if (local) return SHIFT_TEMPLATES.find(s => s.id === local.shiftId) || SHIFT_TEMPLATES[0];
    
    // Then check database
    const db = rosters.find(a => String(a.userId) === String(userId) && a.date === date);
    if (db) return SHIFT_TEMPLATES.find(s => s.id === db.shiftId) || SHIFT_TEMPLATES[0];
    
    return SHIFT_TEMPLATES[0];
  }, [localAssignments, rosters]);

  const handleShiftSelect = (userId: string, date: string, shiftId: string) => {
    const newAssignments = [...localAssignments.filter(a => !(a.userId === userId && a.date === date))];
    newAssignments.push({ id: `temp_${Date.now()}`, userId, date, shiftId });
    setLocalAssignments(newAssignments);
    setShowSelector(null);
  };

  const handleSave = async () => {
    setIsPublishing(true);
    try {
      // Merge local changes with current rosters and push to DB
      const merged = [...rosters];
      localAssignments.forEach(local => {
        const idx = merged.findIndex(r => String(r.userId) === String(local.userId) && r.date === local.date);
        if (idx !== -1) merged[idx] = local;
        else merged.push(local);
      });
      await onSave(merged);
      setLocalAssignments([]);
      alert("Weekly roster successfully published.");
    } catch (e) {
      console.error(e);
    } finally {
      setIsPublishing(false);
    }
  };

  const changeWeek = (offset: number) => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() + offset * 7);
    setSelectedWeekStart(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shift Roster Scheduling</h1>
          <p className="text-sm text-slate-500">Plan and coordinate weekly workforce coverage.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center shadow-sm">
            <button onClick={() => changeWeek(-1)} className="w-8 h-8 rounded-lg hover:bg-slate-50 text-slate-500 transition-all"><i className="fas fa-chevron-left"></i></button>
            <span className="px-4 text-xs font-bold text-slate-700 whitespace-nowrap">
              {new Date(selectedWeekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(weekDays[6].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button onClick={() => changeWeek(1)} className="w-8 h-8 rounded-lg hover:bg-slate-50 text-slate-500 transition-all"><i className="fas fa-chevron-right"></i></button>
          </div>

          <select 
            value={filterDept} 
            onChange={e => setFilterDept(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-700 shadow-sm"
          >
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>

          {localAssignments.length > 0 && (
            <button 
              onClick={handleSave}
              disabled={isPublishing}
              className="px-6 py-2 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-2"
            >
              {isPublishing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-cloud-upload"></i>}
              Publish Changes ({localAssignments.length})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-64 sticky left-0 bg-slate-50/95 backdrop-blur-sm z-20">Employee</th>
                {weekDays.map(wd => (
                  <th key={wd.date} className="p-4 text-center min-w-[120px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{wd.label}</p>
                    <p className="text-sm font-black text-slate-800 mt-1">{wd.day}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 sticky left-0 bg-white group-hover:bg-slate-50/95 backdrop-blur-sm z-10 border-r border-slate-50 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-3">
                      <img src={resolveAvatarUrl(emp.avatar)} className="w-8 h-8 rounded-full border border-slate-100 object-cover" alt="" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate">{emp.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{emp.jobTitle}</p>
                      </div>
                    </div>
                  </td>
                  {weekDays.map(wd => {
                    const shift = getShift(emp.id, wd.date);
                    const isDraft = localAssignments.some(a => a.userId === emp.id && a.date === wd.date);
                    return (
                      <td key={wd.date} className="p-2">
                        <button 
                          onClick={() => setShowSelector({ userId: emp.id, date: wd.date })}
                          className={`w-full p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 group/cell hover:scale-[1.02] active:scale-95 ${shift.color} ${isDraft ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">{shift.name}</span>
                          <span className="text-[8px] opacity-60 font-mono">{shift.startTime} - {shift.endTime}</span>
                          {isDraft && <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full"></span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-20 text-center text-slate-400 italic">No employees found in this criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend & Summary */}
      <div className="flex flex-wrap gap-4">
         {SHIFT_TEMPLATES.map(s => (
           <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
             <div className={`w-3 h-3 rounded-full ${s.color.split(' ')[0]} border border-slate-100`}></div>
             <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{s.name}</span>
           </div>
         ))}
      </div>

      {/* Shift Selector Modal */}
      {showSelector && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Assign Shift</h3>
                <button onClick={() => setShowSelector(null)} className="text-slate-300 hover:text-slate-600"><i className="fas fa-times"></i></button>
              </div>
              <p className="text-xs text-slate-500 mb-6 font-medium">Selecting shift for {employees.find(e => e.id === showSelector.userId)?.name} on {showSelector.date}.</p>
              
              <div className="space-y-3">
                {SHIFT_TEMPLATES.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => handleShiftSelect(showSelector.userId, showSelector.date, s.id)}
                    className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all hover:-translate-y-0.5 active:scale-95 ${s.color}`}
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">{s.name}</p>
                      <p className="text-[10px] opacity-70 font-mono mt-0.5">{s.startTime} - {s.endTime}</p>
                    </div>
                    <i className="fas fa-chevron-right opacity-30"></i>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterPage;

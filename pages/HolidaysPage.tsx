
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, Holiday } from '../types';

interface HolidaysPageProps {
  user: User;
  holidays: Holiday[];
  onAddHoliday: (h: Omit<Holiday, 'id'>) => void;
  onDeleteHoliday: (id: string) => void;
}

const HolidaysPage: React.FC<HolidaysPageProps> = ({ user, holidays, onAddHoliday, onDeleteHoliday }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', description: '' });
  const [holidayToDelete, setHolidayToDelete] = useState<string | null>(null);
  
  // Grouping and expansion state
  const currentYear = new Date().getFullYear();
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

  const canModify = user.role === UserRole.ADMIN || user.role === UserRole.HR;

  // Group holidays by year and sort them
  const groupedHolidays = useMemo(() => {
    const groups: Record<number, Holiday[]> = {};
    
    holidays.forEach(h => {
      const date = new Date(h.date);
      const year = isNaN(date.getTime()) ? currentYear : date.getFullYear();
      if (!groups[year]) groups[year] = [];
      groups[year].push(h);
    });

    // Sort holidays within each year
    Object.keys(groups).forEach(year => {
      groups[Number(year)].sort((a, b) => a.date.localeCompare(b.date));
    });

    return groups;
  }, [holidays, currentYear]);

  // Sorted list of years (descending to show newest/current first)
  const sortedYears = useMemo(() => {
    return Object.keys(groupedHolidays)
      .map(Number)
      .sort((a, b) => b - a);
  }, [groupedHolidays]);

  // Initial expansion logic: Expand current year, collapse others
  useEffect(() => {
    const initialExpansion: Record<number, boolean> = {};
    sortedYears.forEach(year => {
      initialExpansion[year] = year === currentYear;
    });
    // If current year doesn't exist in data, expand the first available year
    if (sortedYears.length > 0 && !initialExpansion[currentYear]) {
        initialExpansion[sortedYears[0]] = true;
    }
    setExpandedYears(initialExpansion);
  }, [sortedYears, currentYear]);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  const handleHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;
    if (!holidayForm.name || !holidayForm.date) return;
    onAddHoliday(holidayForm);
    setHolidayForm({ name: '', date: '', description: '' });
    setShowAddModal(false);
  };

  const confirmDelete = () => {
    if (holidayToDelete) {
      onDeleteHoliday(holidayToDelete);
      setHolidayToDelete(null);
    }
  };

  const holidayBeingDeleted = holidays.find(h => h.id === holidayToDelete);

  const formatDateInfo = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      year: d.getFullYear(),
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' })
    };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Organization Holidays</h1>
          <p className="text-slate-500 font-medium">Official company holidays and observed events calendar.</p>
        </div>
        {canModify && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            Add Holiday
          </button>
        )}
      </div>

      <div className="space-y-6">
        {sortedYears.length > 0 ? (
          sortedYears.map((year) => {
            const isExpanded = expandedYears[year];
            const yearHolidays = groupedHolidays[year];
            
            return (
              <div key={year} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
                {/* Year Header Accordion Trigger */}
                <button 
                  onClick={() => toggleYear(year)}
                  className={`w-full px-8 py-5 flex items-center justify-between transition-colors ${isExpanded ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black tracking-tighter">{year}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isExpanded ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {yearHolidays.length} Events
                    </span>
                    {year === currentYear && !isExpanded && (
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest animate-pulse ml-2">Current Year</span>
                    )}
                  </div>
                  <i className={`fas fa-chevron-down transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-400' : 'text-slate-300'}`}></i>
                </button>

                {/* Holidays List Content */}
                {isExpanded && (
                  <div className="p-8 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    {yearHolidays.map((h) => {
                      const dateInfo = formatDateInfo(h.date);
                      const isPast = new Date(h.date) < new Date(new Date().setHours(0,0,0,0));

                      return (
                        <div 
                          key={h.id} 
                          className={`rounded-3xl border border-slate-100 p-5 flex flex-col sm:flex-row items-center gap-6 transition-all hover:bg-slate-50 ${isPast ? 'opacity-60' : ''}`}
                        >
                          {/* Date Block */}
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex flex-col items-center justify-center shrink-0 border border-slate-100 font-bold group-hover:bg-white transition-colors">
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{dateInfo.month}</span>
                            <span className="text-xl font-black text-slate-800">{dateInfo.day}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 text-center sm:text-left min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-0.5">
                              <h3 className="text-base font-black text-slate-800 truncate">{h.name}</h3>
                              {isPast && (
                                <span className="w-fit mx-auto sm:mx-0 text-[8px] font-black uppercase bg-slate-100 text-slate-400 px-2 py-0.5 rounded tracking-widest">Observed</span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">{dateInfo.weekday}</p>
                            {h.description && (
                              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">{h.description}</p>
                            )}
                          </div>

                          {/* Actions */}
                          {canModify && (
                            <button 
                              onClick={() => setHolidayToDelete(h.id)}
                              className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <i className="fas fa-trash-alt text-sm"></i>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200 text-3xl">
              <i className="fas fa-calendar-times"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800">No Holidays Listed</h3>
            <p className="text-slate-500 max-w-xs mt-2">The organization hasn't added any upcoming holidays to the schedule yet.</p>
          </div>
        )}
      </div>

      {/* Add Holiday Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">Register Holiday</h3>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleHolidaySubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Event Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Annual Retreat"
                  required
                  value={holidayForm.name}
                  onChange={e => setHolidayForm({...holidayForm, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                <input 
                  type="date" 
                  required
                  value={holidayForm.date}
                  onChange={e => setHolidayForm({...holidayForm, date: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Context / Description</label>
                <textarea 
                  placeholder="Optional details..."
                  value={holidayForm.description}
                  onChange={e => setHolidayForm({...holidayForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none text-sm font-medium"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                <button type="submit" className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100">Add Holiday</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {holidayToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-50">
                <i className="fas fa-trash-alt text-2xl"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Event?</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-slate-800">"{holidayBeingDeleted?.name}"</span>? 
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setHolidayToDelete(null)}
                  className="flex-1 px-4 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Keep It
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-4 bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidaysPage;

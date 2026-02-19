
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, Holiday } from '../types';
import ModalPortal from '../components/ModalPortal';

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
  
  const currentYear = new Date().getFullYear();
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

  const canModify = user.role === UserRole.ADMIN || user.role === UserRole.HR;

  const groupedHolidays = useMemo(() => {
    const groups: Record<number, Holiday[]> = {};
    
    holidays.forEach(h => {
      const date = new Date(h.date);
      const year = isNaN(date.getTime()) ? currentYear : date.getFullYear();
      if (!groups[year]) groups[year] = [];
      groups[year].push(h);
    });

    Object.keys(groups).forEach(year => {
      groups[Number(year)].sort((a, b) => a.date.localeCompare(b.date));
    });

    return groups;
  }, [holidays, currentYear]);

  const sortedYears = useMemo(() => {
    return Object.keys(groupedHolidays)
      .map(Number)
      .sort((a, b) => b - a);
  }, [groupedHolidays]);

  useEffect(() => {
    const initialExpansion: Record<number, boolean> = {};
    sortedYears.forEach(year => {
      initialExpansion[year] = year === currentYear;
    });
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
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Organization Holidays</h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">Official company calendar and observed events.</p>
        </div>
        {canModify && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-700 transition-all shadow-sm flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            Add Holiday
          </button>
        )}
      </div>

      <div className="space-y-4">
        {sortedYears.length > 0 ? (
          sortedYears.map((year) => {
            const isExpanded = expandedYears[year];
            const yearHolidays = groupedHolidays[year];
            
            return (
              <div key={year} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <button 
                  onClick={() => toggleYear(year)}
                  className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-100' : 'bg-white hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-slate-800">{year}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${isExpanded ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {yearHolidays.length} Events
                    </span>
                    {year === currentYear && (
                      <span className="text-[9px] font-bold text-primary-600 uppercase tracking-wider">Active Year</span>
                    )}
                  </div>
                  <i className={`fas fa-chevron-down text-xs transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary-600' : 'text-slate-300'}`}></i>
                </button>

                {isExpanded && (
                  <div className="p-2 md:p-4 space-y-2 animate-in slide-in-from-top-1 duration-200">
                    {yearHolidays.map((h) => {
                      const dateInfo = formatDateInfo(h.date);
                      const isPast = new Date(h.date) < new Date(new Date().setHours(0,0,0,0));

                      return (
                        <div 
                          key={h.id} 
                          className={`rounded-xl border border-slate-50 p-3 md:p-4 flex items-center gap-4 transition-all hover:bg-slate-50 group ${isPast ? 'opacity-50' : ''}`}
                        >
                          <div className="w-14 h-14 bg-slate-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-slate-100 group-hover:bg-white transition-colors">
                            <span className="text-[8px] font-bold text-primary-600 uppercase tracking-widest leading-none mb-0.5">{dateInfo.month}</span>
                            <span className="text-lg font-bold text-slate-800 leading-none">{dateInfo.day}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="text-sm font-bold text-slate-800 truncate">{h.name}</h3>
                              {isPast && (
                                <span className="text-[8px] font-bold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Past</span>
                              )}
                            </div>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{dateInfo.weekday}</p>
                            {h.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{h.description}</p>
                            )}
                          </div>

                          {canModify && (
                            <button 
                              onClick={() => setHolidayToDelete(h.id)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <i className="fas fa-trash-alt text-[10px]"></i>
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
          <div className="py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
              <i className="fas fa-calendar-times text-xl"></i>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Holidays Listed</h3>
            <p className="text-slate-400 text-xs mt-1">The organization hasn't added any upcoming holidays yet.</p>
          </div>
        )}
      </div>

      {/* Add Holiday Modal */}
      <ModalPortal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 border border-slate-100">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">New Holiday Entry</h3>
            <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-slate-500">
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
          <form onSubmit={handleHolidaySubmit} className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Holiday Name</label>
              <input 
                type="text" 
                placeholder="e.g. Founder's Day"
                required
                value={holidayForm.name}
                onChange={e => setHolidayForm({...holidayForm, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-sm font-medium text-slate-700"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Observance Date</label>
              <input 
                type="date" 
                required
                value={holidayForm.date}
                onChange={e => setHolidayForm({...holidayForm, date: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-sm font-medium text-slate-700"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Details (Optional)</label>
              <textarea 
                placeholder="Brief description..."
                value={holidayForm.description}
                onChange={e => setHolidayForm({...holidayForm, description: e.target.value})}
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all resize-none text-sm font-medium text-slate-700"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 text-slate-400 font-bold text-xs">Cancel</button>
              <button type="submit" className="flex-[2] py-2.5 bg-primary-600 text-white font-bold text-xs uppercase rounded-xl shadow-md hover:bg-primary-700 transition-all">Add Event</button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* Delete Confirmation Modal */}
      <ModalPortal isOpen={!!holidayToDelete} onClose={() => setHolidayToDelete(null)}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-trash-alt text-lg"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Remove Event?</h3>
            <p className="text-slate-500 text-xs mb-6 px-2">
              Confirm deletion of <span className="font-bold text-slate-800">"{holidayBeingDeleted?.name}"</span> from the schedule.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setHolidayToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase rounded-xl hover:bg-slate-200 transition-all"
              >
                Keep
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-rose-600 text-white font-bold text-[10px] uppercase rounded-xl hover:bg-rose-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};

export default HolidaysPage;

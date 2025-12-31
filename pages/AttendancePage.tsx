
import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Attendance, SystemConfig, Holiday, UserRole } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';

interface AttendancePageProps {
  loggedInUser: User;
  attendances: Attendance[];
  systemConfig: SystemConfig;
  holidays: Holiday[];
  employees: User[];
}

const AttendancePage: React.FC<AttendancePageProps> = ({ loggedInUser, attendances, systemConfig, holidays, employees }) => {
  const { id } = useParams<{ id?: string }>();
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Determine target user (self or requested if admin/HR)
  const isHRorAdmin = loggedInUser.role === UserRole.ADMIN || loggedInUser.role === UserRole.HR;
  const isManager = loggedInUser.role === UserRole.MANAGER;
  const canSeeGPS = isHRorAdmin || isManager;

  const targetUser = useMemo(() => {
    if (id && isHRorAdmin) {
      return employees.find(e => String(e.id) === String(id)) || loggedInUser;
    }
    return loggedInUser;
  }, [id, employees, loggedInUser, isHRorAdmin]);

  const isViewingSelf = String(targetUser.id) === String(loggedInUser.id);

  const formatSeconds = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  const userLogsAggregated = useMemo(() => {
    const filtered = attendances.filter(a => String(a.userId) === String(targetUser.id));
    const dailyMap: Record<string, Attendance> = {};
    filtered.forEach(log => {
      if (!dailyMap[log.date]) {
        dailyMap[log.date] = { ...log };
      } else {
        const existing = dailyMap[log.date];
        const currentTotal = (existing.accumulatedTime || 0) + (log.accumulatedTime || 0);
        dailyMap[log.date] = {
          ...existing,
          checkOut: log.checkOut || existing.checkOut,
          accumulatedTime: currentTotal,
          lateReason: existing.lateReason || log.lateReason,
          latitude: existing.latitude || log.latitude,
          longitude: existing.longitude || log.longitude
        };
      }
    });
    return Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendances, targetUser.id]);

  const getAttendanceStatus = (dateStr: string, log?: Attendance) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    const holiday = holidays.find(h => h.date === dateStr);

    if (log) {
      try {
        if (log.lateReason) return { label: 'LATE', class: 'bg-rose-100 text-rose-700' };
        const shiftStart = targetUser.shiftStart || systemConfig.workStartTime;
        const [checkH, checkM] = log.checkIn.split(':').map(Number);
        const [shiftH, shiftM] = shiftStart.split(':').map(Number);
        const checkMinutes = checkH * 60 + checkM;
        const shiftMinutes = shiftH * 60 + shiftM;
        const grace = systemConfig.gracePeriodMinutes || 0;
        if (checkMinutes > shiftMinutes + grace) return { label: 'LATE', class: 'bg-rose-100 text-rose-700' };
        return { label: 'ON TIME', class: 'bg-emerald-100 text-emerald-700' };
      } catch {
        return { label: 'PRESENT', class: 'bg-emerald-100 text-emerald-700' };
      }
    }

    if (holiday) return { label: holiday.name, class: 'bg-amber-100 text-amber-700' };
    if (isWeekend) return { label: 'DAY OFF', class: 'bg-slate-100 text-slate-500' };
    
    const today = new Date().toISOString().split('T')[0];
    if (dateStr > today) return { label: '--', class: 'text-slate-300' };
    return { label: 'ABSENT', class: 'bg-rose-50 text-rose-300' };
  };

  const getLocationIcon = (loc?: string) => {
    switch(loc?.toLowerCase()) {
      case 'office': return 'fa-building';
      case 'home': return 'fa-house-user';
      case 'client site': return 'fa-handshake';
      default: return 'fa-map-marker-alt';
    }
  };

  const handleExportCSV = () => {
    if (userLogsAggregated.length === 0) {
      alert("No attendance records to export.");
      return;
    }
    const headers = ['Date', 'First Check In', 'Last Check Out', 'Total Working Time', 'Location', ...(canSeeGPS ? ['Latitude', 'Longitude'] : []), 'Status', 'Late Reason'];
    const rows = userLogsAggregated.map(log => {
      const status = getAttendanceStatus(log.date, log);
      const baseRow = [
        `"${log.date}"`,
        `"${log.checkIn}"`,
        `"${log.checkOut || '--:--'}"`,
        `"${formatSeconds(log.accumulatedTime || 0)}"`,
        `"${log.location || 'Remote'}"`
      ];
      
      if (canSeeGPS) {
        baseRow.push(`"${log.latitude || ''}"`);
        baseRow.push(`"${log.longitude || ''}"`);
      }
      
      baseRow.push(`"${status.label}"`);
      baseRow.push(`"${log.lateReason || ''}"`);
      
      return baseRow;
    });
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_Report_${targetUser.name.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month);
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ date: d, iso });
    }
    return days;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  return (
    <div className="space-y-6">
      {!isViewingSelf && (
        <div className="bg-primary-600 p-6 rounded-[2rem] text-white shadow-xl shadow-primary-100 flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
              <i className="fas fa-arrow-left"></i>
            </Link>
            <img src={resolveAvatarUrl(targetUser.avatar)} className="w-12 h-12 rounded-2xl border-2 border-white/20 object-cover" alt="" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary-200">Admin Viewing</p>
              <h2 className="text-xl font-bold">{targetUser.name}'s Attendance</h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-200">Member ID</p>
            <p className="font-mono font-bold">{targetUser.employeeId}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isViewingSelf ? 'My Attendance Log' : 'Detailed Log'}</h1>
          <p className="text-sm text-slate-500">Punctuality and work duration records.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start">
          <button 
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'table' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <i className="fas fa-list mr-2"></i> Table
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'calendar' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <i className="fas fa-calendar-alt mr-2"></i> Calendar
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
            title="Export CSV"
          >
            <i className="fas fa-download"></i>
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check In</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check Out</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location & GPS</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userLogsAggregated.map((log) => {
                  const status = getAttendanceStatus(log.date, log);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">{log.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600 font-mono font-bold">{log.checkIn}</span>
                        {log.lateReason && (
                          <p className="text-[9px] text-rose-500 italic mt-0.5" title={log.lateReason}>
                            Reason: {log.lateReason}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{(!log.checkOut || log.checkOut === '00:00:00') ? '--:--' : log.checkOut}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600 font-mono">
                        {formatSeconds(log.accumulatedTime || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md w-fit ${
                            log.location === 'Office' ? 'bg-primary-50 text-primary-600' :
                            log.location === 'Home' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-amber-50 text-amber-600'
                          }`}>
                            <i className={`fas ${getLocationIcon(log.location)}`}></i>
                            {log.location || 'Remote'}
                          </span>
                          {canSeeGPS && log.latitude && log.longitude && (
                            <a 
                              href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[9px] text-slate-400 hover:text-primary-600 flex items-center gap-1 transition-colors"
                            >
                              <i className="fas fa-location-dot"></i>
                              {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {userLogsAggregated.length === 0 && (
                   <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">No attendance records found for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => changeMonth(-1)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all">
                <i className="fas fa-chevron-left"></i>
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-slate-50 text-slate-500 font-bold text-xs uppercase rounded-xl hover:bg-slate-100">Today</button>
              <button onClick={() => changeMonth(1)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all">
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-2xl overflow-hidden shadow-inner">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-slate-50 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="bg-white min-h-[120px]"></div>;
              const log = userLogsAggregated.find(l => l.date === day.iso);
              const status = getAttendanceStatus(day.iso, log);
              const isToday = day.iso === new Date().toISOString().split('T')[0];
              return (
                <div key={day.iso} className={`bg-white min-h-[120px] p-3 transition-all relative group hover:bg-slate-50 ${isToday ? 'ring-2 ring-primary-500 ring-inset' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-black ${isToday ? 'text-primary-600' : 'text-slate-400'}`}>
                      {day.date.getDate()}
                    </span>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${status.class}`}>
                      {status.label}
                    </span>
                  </div>
                  {log && (
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold text-slate-700">{log.checkIn} - {log.checkOut || '--:--'}</div>
                      <div className="text-[9px] font-black text-primary-600">{formatSeconds(log.accumulatedTime || 0)}</div>
                      {canSeeGPS && log.latitude && (
                         <div className="text-[7px] text-slate-300 font-mono truncate">GPS Verified</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
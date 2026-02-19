
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { User, Attendance, LeaveStatus, Holiday, LeaveBalance, LeaveRequest, SystemConfig, TimesheetEntry, UserRole, RosterAssignment } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';
import { Link, useNavigate } from 'react-router-dom';
import ModalPortal from '../components/ModalPortal';

interface DashboardProps {
  user: User;
  employees: User[];
  attendances: Attendance[];
  leaveRequests: LeaveRequest[];
  leaveBalances: LeaveBalance[];
  holidays: Holiday[];
  timesheetEntries: TimesheetEntry[];
  onCheckIn: (loc?: string, reason?: string, lat?: number, lon?: number) => void;
  onCheckOut: () => void;
  isSyncing?: boolean;
  systemConfig: SystemConfig;
  rosters?: RosterAssignment[];
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  employees,
  attendances, 
  leaveRequests, 
  leaveBalances, 
  holidays,
  timesheetEntries,
  onCheckIn, 
  onCheckOut,
  systemConfig,
  rosters = []
}) => {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showLateReasonModal, setShowLateReasonModal] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>(undefined);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lon: number} | null>(null);
  const [lateReason, setLateReason] = useState('');
  const [locationPermission, setLocationPermission] = useState<PermissionState | 'unsupported' | 'unknown'>('unknown');
  const navigate = useNavigate();
  
  const getCompanyTime = useCallback(() => {
    const now = new Date();
    if (!systemConfig?.timezone) return now;
    const match = systemConfig.timezone.match(/UTC([+-]\d+)(?::(\d+))?/);
    if (!match) return now;
    const hoursOffset = parseInt(match[1]);
    const minutesOffset = parseInt(match[2] || "0") * (hoursOffset < 0 ? -1 : 1);
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * hoursOffset) + (60000 * minutesOffset));
  }, [systemConfig?.timezone]);

  const [now, setNow] = useState(getCompanyTime());

  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as any }).then(status => {
        setLocationPermission(status.state);
        status.onchange = () => {
          setLocationPermission(status.state);
        };
      });
    } else {
      setLocationPermission('unsupported');
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(getCompanyTime()), 1000);
    return () => clearInterval(timer);
  }, [getCompanyTime]);
  
  const parseDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr || timeStr === '00:00:00' || timeStr === '--:--' || timeStr === 'null' || timeStr === 'undefined' || timeStr === '') return null;
    const normalizedDate = dateStr.replace(/-/g, '/');
    const timeParts = timeStr.split(':');
    const normalizedTime = timeParts.length === 2 ? `${timeStr}:00` : timeStr;
    const d = new Date(`${normalizedDate} ${normalizedTime}`);
    return isNaN(d.getTime()) ? null : d;
  };

  const todayStr = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [now]);

  const activeRosterShift = useMemo(() => {
    if (systemConfig?.schedulingMode !== 'WEEKLY_ROSTER') return null;
    const assignment = rosters.find(r => String(r.userId) === String(user.id) && r.date === todayStr);
    if (!assignment) return null;
    
    const templates: Record<string, string> = { 'gen': '10:00', 'morn': '06:00', 'eve': '14:00', 'night': '22:00' };
    return templates[assignment.shiftId] || null;
  }, [rosters, user.id, todayStr, systemConfig?.schedulingMode]);

  const effectiveShiftStart = useMemo(() => {
    if (systemConfig?.schedulingMode === 'WEEKLY_ROSTER' && activeRosterShift) {
      return activeRosterShift;
    }
    return user.shiftStart || systemConfig?.workStartTime || "09:00";
  }, [user.shiftStart, systemConfig?.workStartTime, systemConfig?.schedulingMode, activeRosterShift]);

  const formatSeconds = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const userRecords = useMemo(() => {
    return (attendances || [])
      .filter(a => String(a.userId) === String(user.id))
      .sort((a, b) => {
        const dateDiff = b.date.localeCompare(a.date);
        if (dateDiff !== 0) return dateDiff;
        return (b.checkIn || '').localeCompare(a.checkIn || '');
      });
  }, [attendances, user.id]);

  const todayRecords = useMemo(() => {
    return userRecords.filter(a => String(a.date) === String(todayStr));
  }, [userRecords, todayStr]);

  const activeRecord = useMemo(() => {
    return todayRecords.find(a => {
      const coStr = String(a.checkOut || '');
      return !coStr.includes(':') || coStr === '00:00:00' || coStr === 'null' || coStr === '' || coStr === 'undefined';
    });
  }, [todayRecords]);

  const isCurrentlyIn = !!activeRecord;

  const isOnLeaveToday = useMemo(() => {
    return (leaveRequests || []).some(lr => 
      String(lr.userId) === String(user.id) && 
      lr.status === LeaveStatus.APPROVED && 
      todayStr >= lr.startDate && todayStr <= lr.endDate
    );
  }, [leaveRequests, user.id, todayStr]);
  
  const dailySeconds = useMemo(() => {
    let total = 0;
    todayRecords.forEach(rec => {
      if (rec === activeRecord) {
        total += rec.accumulatedTime || 0;
        const segmentStartStr = rec.lastClockIn || rec.checkIn;
        const start = parseDateTime(rec.date, segmentStartStr);
        if (start) total += Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
      } else {
        total += rec.accumulatedTime || 0;
      }
    });
    return total;
  }, [todayRecords, activeRecord, now]);

  const fetchGeolocation = (): Promise<{lat: number, lon: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationPermission('granted');
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setLocationPermission('denied');
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  const handleClockInAttempt = async () => {
    if (locationPermission === 'denied') {
      alert("Location access is blocked. Please allow location to clock in.");
      return;
    }

    setIsGettingLocation(true);
    try {
      const coords = await fetchGeolocation();
      setCurrentCoords(coords);
      setShowLocationModal(true);
    } catch (err: any) {
      alert("Verification failed: You must allow location access to record attendance.");
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleLocationSelect = async (loc: string) => {
    setSelectedLocation(loc);
    setShowLocationModal(false);

    const shiftStart = effectiveShiftStart;
    const [sH, sM] = shiftStart.split(':').map(Number);
    const shiftDate = new Date(now);
    shiftDate.setHours(sH, sM, 0, 0);
    const graceLimit = new Date(shiftDate.getTime() + (systemConfig?.gracePeriodMinutes || 15) * 60000);

    if (now > graceLimit && todayRecords.length === 0) {
      setShowLateReasonModal(true);
    } else {
      onCheckIn(loc, undefined, currentCoords?.lat, currentCoords?.lon);
    }
  };

  const handleLateReasonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lateReason.trim()) return;
    onCheckIn(selectedLocation, lateReason, currentCoords?.lat, currentCoords?.lon);
    setShowLateReasonModal(false);
    setLateReason('');
    setCurrentCoords(null);
  };

  const pendingRequests = useMemo(() => {
    const isHRorAdmin = user.role === UserRole.HR || user.role === UserRole.ADMIN;
    const isManager = user.role === UserRole.MANAGER;

    if (isHRorAdmin) {
      return leaveRequests.filter(r => r.status === LeaveStatus.PENDING && r.userId !== user.id);
    }
    if (isManager) {
      const reportees = employees.filter(e => e.managerId === user.id).map(e => e.id);
      return leaveRequests.filter(r => r.status === LeaveStatus.PENDING && reportees.includes(r.userId));
    }
    return leaveRequests.filter(r => r.status === LeaveStatus.PENDING && r.userId === user.id);
  }, [leaveRequests, user, employees]);

  const totalRemainingLeaves = useMemo(() => {
    return leaveBalances
      .filter(b => b.userId === user.id)
      .reduce((sum, b) => sum + (b.total - (b.used || 0)), 0);
  }, [leaveBalances, user.id]);

  const myTeamStatus = useMemo(() => {
    if (user.role === UserRole.EMPLOYEE) return [];
    
    const isSpecialRole = user.role === UserRole.HR || user.role === UserRole.ADMIN;
    const directReports = employees.filter(e => e.managerId === user.id || (isSpecialRole && e.id !== user.id));

    return directReports.map(emp => {
      const onLeave = leaveRequests.find(r => 
        String(r.userId) === String(emp.id) && 
        r.status === LeaveStatus.APPROVED && 
        todayStr >= r.startDate && todayStr <= r.endDate
      );
      
      const attRecord = attendances.find(a => String(a.userId) === String(emp.id) && a.date === todayStr);
      const isCurrentlyInTeam = attRecord && (!attRecord.checkOut || attRecord.checkOut === '00:00:00' || attRecord.checkOut === 'null' || attRecord.checkOut === '');

      let status = 'Offline';
      let color = 'bg-slate-100 text-slate-500 border-slate-200';
      if (onLeave) {
        status = 'On Leave';
        color = 'bg-amber-50 text-amber-600 border-amber-100';
      } else if (isCurrentlyInTeam) {
        status = 'In';
        color = 'bg-emerald-50 text-emerald-600 border-emerald-100';
      } else if (attRecord && attRecord.checkOut) {
        status = 'Out';
        color = 'bg-rose-50 text-rose-600 border-rose-100';
      }

      return { ...emp, status, color, isCurrentlyIn: isCurrentlyInTeam };
    }).sort((a, b) => {
      const order: Record<string, number> = { 'In': 0, 'On Leave': 1, 'Out': 2, 'Offline': 3 };
      return order[a.status] - order[b.status];
    });
  }, [employees, attendances, leaveRequests, todayStr, user]);

  const birthdaysToday = useMemo(() => {
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    return (employees || [])
      .filter(emp => {
        if (!emp.dob) return false;
        const parts = emp.dob.split('-');
        return parseInt(parts[1]) === currentMonth && parseInt(parts[2]) === currentDay;
      });
  }, [employees, now]);

  return (
    <div className="space-y-6 relative min-h-full">
      {/* Background Polish */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px] -z-10"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 id="tour-welcome-msg" className="text-2xl font-black text-slate-900 tracking-tight">Welcome, {user.name.split(' ')[0]}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm ${
              isOnLeaveToday
                ? 'bg-amber-50 text-amber-600 border-amber-100'
                : isCurrentlyIn 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse' 
                  : (todayRecords.length > 0)
                    ? 'bg-rose-50 text-rose-600 border-rose-100' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {isOnLeaveToday ? 'On Leave' : isCurrentlyIn ? 'In' : (todayRecords.length > 0) ? 'Out' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-400 text-sm font-bold">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              <span className="ml-2 text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-500 font-black uppercase tracking-tighter">{systemConfig?.timezone || "UTC"}</span>
            </p>
          </div>
        </div>
        
        <div id="tour-attendance-widget" className="flex bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative self-start ring-4 ring-slate-100/50">
          <button 
            onClick={handleClockInAttempt}
            disabled={isCurrentlyIn || isGettingLocation || isOnLeaveToday}
            className={`px-8 py-3.5 flex items-center gap-3 font-black transition-all group ${
              isCurrentlyIn || isGettingLocation || isOnLeaveToday
                ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                : locationPermission === 'denied'
                  ? 'bg-rose-50 text-rose-500 border-rose-100 border-r hover:bg-rose-100'
                  : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98]'
            }`}
          >
            <i className={`fas ${
              isGettingLocation ? 'fa-spinner fa-spin' : 
              isCurrentlyIn ? 'fa-check-circle' : 
              locationPermission === 'denied' ? 'fa-location-dot' : 'fa-sign-in-alt'
            } text-sm`}></i>
            <span className="text-xs uppercase tracking-widest">
              {isGettingLocation ? 'Syncing...' : isCurrentlyIn ? 'Working' : 'Clock In'}
            </span>
          </button>
          
          <button 
            onClick={onCheckOut}
            disabled={!isCurrentlyIn}
            className={`px-8 py-3.5 flex items-center gap-3 font-black transition-all text-xs uppercase tracking-widest ${
              !isCurrentlyIn 
                ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                : 'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98]'
            }`}
          >
            <i className="fas fa-sign-out-alt"></i>
            Clock Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200 flex items-center gap-5 hover:border-primary-200 transition-colors group">
          <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
            <i className="fas fa-calendar-check"></i>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-0.5">Leave Balance</p>
            <p className="text-2xl font-black text-slate-900">{totalRemainingLeaves} <span className="text-sm text-slate-400 font-bold uppercase ml-1">Days</span></p>
          </div>
        </div>

        <div className={`bg-white p-5 rounded-[2rem] shadow-sm border flex items-center gap-5 transition-all duration-300 group ${isCurrentlyIn ? 'border-emerald-200 ring-4 ring-emerald-50' : 'border-slate-200 hover:border-emerald-100'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${isCurrentlyIn ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-300 group-hover:text-emerald-400'}`}>
            <i className={`fas fa-stopwatch ${isCurrentlyIn ? 'animate-pulse' : ''}`}></i>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-0.5">Daily Track</p>
            <p className={`text-2xl font-mono font-black transition-colors ${isCurrentlyIn ? 'text-emerald-600' : 'text-slate-900'}`}>
              {formatSeconds(dailySeconds)}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200 flex items-center gap-5 hover:border-amber-200 transition-colors group">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
            <i className="fas fa-tasks"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-0.5">Pending Action</p>
            <p className="text-2xl font-black text-slate-900">{pendingRequests.length} <span className="text-sm text-slate-400 font-bold uppercase ml-1">Tasks</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-primary-500 rounded-full"></div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Recent Activity</h3>
              </div>
              <Link to="/attendance" className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary-600 hover:border-primary-400 transition-all shadow-sm">View Archive</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Shift Detail</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Work Duration</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Node</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {userRecords.slice(0, 10).map((att) => (
                    <tr key={att.id} className="hover:bg-primary-50/30 transition-colors group">
                      <td className="px-8 py-5 text-sm font-bold text-slate-700">{att.date}</td>
                      <td className="px-8 py-5 text-xs font-mono text-slate-500 group-hover:text-primary-600 transition-colors">{att.checkIn} - {att.checkOut || '--:--'}</td>
                      <td className="px-8 py-5 text-sm font-black text-slate-800">{formatSeconds(att.accumulatedTime || 0)}</td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-200 group-hover:bg-primary-50 group-hover:text-primary-600 group-hover:border-primary-100 transition-all">
                          {att.location || 'Remote'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {userRecords.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-32 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                           <i className="fas fa-history text-2xl"></i>
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">No activity recorded for this period</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {user.role !== UserRole.EMPLOYEE && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                   <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Team Live Feed</h3>
                 </div>
                 <Link to="/team" className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:border-indigo-400 transition-all shadow-sm">Directory</Link>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myTeamStatus.slice(0, 10).map(report => (
                  <div 
                    key={report.id} 
                    onClick={() => navigate(`/profile/${report.id}`)}
                    className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all shadow-sm bg-white"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <img src={resolveAvatarUrl(report.avatar)} className="w-10 h-10 rounded-2xl object-cover ring-2 ring-slate-50 shadow-sm" />
                        {report.isCurrentlyIn && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-2 border-white"></span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate">{report.name}</p>
                        <p className="text-[10px] text-slate-400 truncate font-bold uppercase tracking-tighter">{report.jobTitle || 'Team Member'}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0 ${report.color}`}>
                      {report.status}
                    </span>
                  </div>
                ))}
                {myTeamStatus.length === 0 && <p className="col-span-full py-16 text-center text-slate-400 italic text-xs font-bold uppercase tracking-widest">No team members assigned to your node</p>}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Pending Requests</h3>
              <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                 <i className="fas fa-bell text-xs"></i>
              </div>
            </div>
            <div className="space-y-4">
              {pendingRequests.length > 0 ? pendingRequests.slice(0, 5).map(req => (
                <div key={req.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-amber-200 transition-all cursor-default">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate">{req.userName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{req.startDate}</p>
                  </div>
                  <Link to={user.role !== UserRole.EMPLOYEE ? "/approvals" : "/leave"} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black text-primary-600 hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all shadow-sm uppercase tracking-widest">Process</Link>
                </div>
              )) : (
                <div className="text-center py-10 opacity-40">
                  <i className="fas fa-check-circle text-2xl text-slate-300 mb-2"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest">Inbox Clean</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 relative overflow-hidden group">
            {/* Design Element */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Today's Birthdays</h3>
              <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center text-lg shadow-inner">
                <i className="fas fa-cake-candles"></i>
              </div>
            </div>
            <div className="space-y-4 relative z-10">
              {birthdaysToday.length > 0 ? birthdaysToday.map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-4 rounded-3xl bg-gradient-to-br from-primary-50/50 to-white border border-primary-100 ring-4 ring-primary-50/20 transition-all hover:scale-[1.02]">
                  <div className="flex items-center gap-4 min-w-0">
                    <img src={resolveAvatarUrl(emp.avatar)} className="w-12 h-12 rounded-2xl object-cover ring-4 ring-white shadow-md" alt="" />
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate text-primary-900">{emp.name}</p>
                      <p className="text-[10px] text-primary-600 uppercase font-black tracking-tighter mt-0.5 flex items-center gap-1">
                        Celebrating! <span className="animate-bounce">🎉</span>
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-slate-200">
                    <i className="fas fa-calendar-day text-2xl"></i>
                  </div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">No celebrations today</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
              <i className="fas fa-rocket text-8xl"></i>
            </div>
            <h4 className="text-xl font-black mb-2 tracking-tight">System Status</h4>
            <p className="text-slate-400 text-xs leading-relaxed mb-6 font-medium">Verified connectivity to HR cloud node. Standard backup protocol active.</p>
            <div className="flex items-center gap-3">
               <div className="flex -space-x-2">
                 {employees.slice(0, 3).map(e => <img key={e.id} src={resolveAvatarUrl(e.avatar)} className="w-6 h-6 rounded-full border-2 border-slate-900 object-cover" />)}
               </div>
               <span className="text-[9px] font-black uppercase tracking-widest text-primary-400">Nodes Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* Location Modal */}
      <ModalPortal isOpen={showLocationModal} onClose={() => { setShowLocationModal(false); setCurrentCoords(null); }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl shadow-sm">
              <i className="fas fa-map-location-dot"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Verify Location</h3>
            <p className="text-slate-400 text-xs mb-6 px-4">Capture presence at your current coordinates.</p>
            
            <div className="grid grid-cols-1 gap-3 mb-8">
              {['Office', 'Home', 'Client Site'].map(loc => (
                <button 
                  key={loc} 
                  onClick={() => handleLocationSelect(loc)} 
                  className="py-3.5 border border-slate-200 rounded-xl flex items-center justify-center gap-3 transition-all hover:border-primary-600 hover:bg-primary-50 group font-bold text-sm text-slate-700"
                >
                  <i className="fas fa-location-dot text-slate-300 group-hover:text-primary-500"></i>
                  {loc}
                </button>
              ))}
            </div>
            
            <button onClick={() => { setShowLocationModal(false); setCurrentCoords(null); }} className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600">
              Cancel
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Late Reason Modal */}
      <ModalPortal isOpen={showLateReasonModal}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
          <div className="p-6">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mb-4 text-xl"><i className="fas fa-clock"></i></div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Delayed Check-in</h3>
            <p className="text-xs text-slate-500 mb-4">Please provide a reason for logging in after {effectiveShiftStart}.</p>
            <form onSubmit={handleLateReasonSubmit} className="space-y-4">
              <textarea autoFocus required placeholder="Reason for delay..." value={lateReason} onChange={(e) => setLateReason(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 text-sm min-h-[80px] resize-none" />
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowLateReasonModal(false); setShowLocationModal(true); }} className="flex-1 py-2.5 text-slate-400 font-bold text-sm">Back</button>
                <button type="submit" className="flex-[2] py-2.5 bg-rose-600 text-white font-bold rounded-xl text-sm shadow-md">Clock In</button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};

export default Dashboard;

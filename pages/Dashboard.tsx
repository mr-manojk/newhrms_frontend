
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { User, Attendance, LeaveStatus, Holiday, LeaveBalance, LeaveRequest, SystemConfig, TimesheetEntry, UserRole } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';
import { Link } from 'react-router-dom';

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
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  employees,
  attendances, 
  leaveRequests, 
  leaveBalances, 
  timesheetEntries,
  onCheckIn, 
  onCheckOut,
  systemConfig
}) => {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showLateReasonModal, setShowLateReasonModal] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>(undefined);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lon: number} | null>(null);
  const [lateReason, setLateReason] = useState('');
  const [locationPermission, setLocationPermission] = useState<PermissionState | 'unsupported'>('prompt');
  const [showConsentBanner, setShowConsentBanner] = useState(true);
  
  const getCompanyTime = useCallback(() => {
    const now = new Date();
    if (!systemConfig.timezone) return now;
    const match = systemConfig.timezone.match(/UTC([+-]\d+)(?::(\d+))?/);
    if (!match) return now;
    const hoursOffset = parseInt(match[1]);
    const minutesOffset = parseInt(match[2] || "0") * (hoursOffset < 0 ? -1 : 1);
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * hoursOffset) + (60000 * minutesOffset));
  }, [systemConfig.timezone]);

  const [now, setNow] = useState(getCompanyTime());

  // Monitor Location Permissions
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as any }).then(status => {
        setLocationPermission(status.state);
        if (status.state === 'granted') setShowConsentBanner(false);
        status.onchange = () => {
          setLocationPermission(status.state);
          if (status.state === 'granted') setShowConsentBanner(false);
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
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  const handleLocationSelect = async (loc: string) => {
    setSelectedLocation(loc);
    setIsGettingLocation(true);
    let coords = null;
    try {
      coords = await fetchGeolocation();
      setCurrentCoords(coords);
    } catch (err) {
      console.warn("Could not get precise geolocation:", err);
      alert("Note: Location access is required for verified attendance. Please enable location services in your browser.");
    } finally {
      setIsGettingLocation(false);
      setShowLocationModal(false);
    }

    const shiftStart = user.shiftStart || systemConfig.workStartTime;
    const [sH, sM] = shiftStart.split(':').map(Number);
    const shiftDate = new Date(now);
    shiftDate.setHours(sH, sM, 0, 0);
    const graceLimit = new Date(shiftDate.getTime() + (systemConfig.gracePeriodMinutes || 15) * 60000);

    // If we have coords or if it was blocked but user is trying to clock in, 
    // we continue if we're not handling late reason.
    if (now > graceLimit && todayRecords.length === 0) {
      setShowLateReasonModal(true);
    } else {
      onCheckIn(loc, undefined, coords?.lat, coords?.lon);
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

  const getLocationIcon = (loc?: string) => {
    switch(loc?.toLowerCase()) {
      case 'office': return 'fa-building';
      case 'home': return 'fa-house-user';
      case 'client site': return 'fa-handshake';
      default: return 'fa-map-marker-alt';
    }
  };

  const getLocationConfig = (loc: string) => {
    switch(loc.toLowerCase()) {
      case 'office': return {
        button: 'bg-primary-50 border-primary-100 text-primary-600 hover:bg-primary-600 hover:text-white hover:border-primary-600',
        icon: 'group-hover:text-primary-600'
      };
      case 'home': return {
        button: 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
        icon: 'group-hover:text-emerald-600'
      };
      case 'client site': return {
        button: 'bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white hover:border-emerald-600',
        icon: 'group-hover:text-emerald-600'
      };
      default: return {
        button: 'bg-slate-50 border-slate-100 text-slate-600',
        icon: ''
      };
    }
  };

  const isApprover = user.role === UserRole.MANAGER || user.role === UserRole.HR || user.role === UserRole.ADMIN;

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

  const birthdaysToday = useMemo(() => {
    return employees
      .filter(e => {
        if (!e.dob) return false;
        const bday = new Date(e.dob);
        return bday.getMonth() === now.getMonth() && bday.getDate() === now.getDate();
      })
      .slice(0, 3);
  }, [employees, now]);

  const totalRemainingLeaves = useMemo(() => {
    return leaveBalances
      .filter(b => b.userId === user.id)
      .reduce((sum, b) => sum + (b.total - (b.used || 0)), 0);
  }, [leaveBalances, user.id]);

  const whosOutToday = useMemo(() => {
    return employees
      .map(emp => {
        const onLeave = leaveRequests.find(r => 
          String(r.userId) === String(emp.id) && 
          r.status === LeaveStatus.APPROVED && 
          todayStr >= r.startDate && todayStr <= r.endDate
        );
        if (onLeave) return { user: emp, status: 'On Leave', type: 'leave' as const };
        const record = attendances.find(a => String(a.userId) === String(emp.id) && a.date === todayStr);
        if (!record) return { user: emp, status: 'Offline', type: 'offline' as const };
        const isLoggedOut = record.checkOut && record.checkOut !== '00:00:00' && record.checkOut !== 'null' && record.checkOut !== '';
        if (isLoggedOut) return { user: emp, status: 'Logged Out', type: 'logged-out' as const };
        return null;
      })
      .filter((item): item is { user: User; status: string; type: 'leave' | 'offline' | 'logged-out' } => item !== null)
      .sort((a, b) => {
        const order = { leave: 0, 'logged-out': 1, offline: 2 };
        return order[a.type] - order[b.type];
      });
  }, [leaveRequests, todayStr, employees, attendances]);

  return (
    <div className="space-y-6">
      {/* Location Consent Banner */}
      {showConsentBanner && locationPermission !== 'granted' && (
        <div className="bg-primary-600 rounded-3xl p-6 shadow-xl shadow-primary-100 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl shrink-0">
              <i className="fas fa-location-dot"></i>
            </div>
            <div className="text-white">
              <h4 className="text-lg font-black tracking-tight leading-none mb-1">Location Access Consent</h4>
              <p className="text-sm text-primary-100 font-medium">NexusHR requires location services to verify your attendance records via geofencing.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setShowConsentBanner(false)} 
              className="px-6 py-2.5 text-primary-100 font-bold hover:text-white transition-colors"
            >
              Learn More
            </button>
            <button 
              onClick={() => {
                navigator.geolocation.getCurrentPosition(() => setLocationPermission('granted'));
                setShowConsentBanner(false);
              }}
              className="px-8 py-2.5 bg-white text-primary-600 font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-primary-50 transition-all shadow-lg"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 id="tour-welcome-msg" className="text-2xl font-bold text-slate-900">Welcome, {user.name.split(' ')[0]}!</h1>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
              isOnLeaveToday
                ? 'bg-amber-50 text-amber-600 border-amber-100'
                : isCurrentlyIn 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse' 
                  : (todayRecords.length > 0)
                    ? 'bg-rose-50 text-rose-600 border-rose-100' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {isOnLeaveToday ? 'On Leave' : isCurrentlyIn ? 'Checked In' : (todayRecords.length > 0) ? 'Logged Out' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="text-slate-500 text-sm">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              <span className="ml-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-400 font-bold">{systemConfig.timezone}</span>
            </div>
          </div>
        </div>
        
        <div id="tour-attendance-widget" className="flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
          <button 
            onClick={() => setShowLocationModal(true)}
            disabled={isCurrentlyIn || isGettingLocation || isOnLeaveToday}
            className={`px-6 py-3 flex items-center gap-2 font-semibold transition-all ${
              isCurrentlyIn || isGettingLocation || isOnLeaveToday
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' 
                : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98]'
            }`}
          >
            <i className={`fas ${isGettingLocation ? 'fa-spinner fa-spin' : isCurrentlyIn ? 'fa-check-circle' : 'fa-sign-in-alt'}`}></i>
            {isGettingLocation ? 'Capturing Coords...' : isCurrentlyIn ? 'Clocked In' : 'Clock In'}
          </button>
          
          <button 
            onClick={onCheckOut}
            disabled={!isCurrentlyIn}
            className={`px-6 py-3 flex items-center gap-2 font-semibold transition-all ${
              !isCurrentlyIn 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' 
                : 'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98]'
            }`}
          >
            <i className="fas fa-sign-out-alt"></i>
            Clock Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-calendar-check"></i>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Leave Balance</p>
            <p className="text-2xl font-bold text-slate-800">{totalRemainingLeaves} Days</p>
          </div>
        </div>

        <div className={`bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4 transition-all duration-300 ${isCurrentlyIn ? 'border-emerald-200 ring-2 ring-emerald-50 shadow-emerald-50/50' : 'border-slate-200'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${isCurrentlyIn ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
            <i className={`fas fa-stopwatch ${isCurrentlyIn ? 'fa-spin' : ''}`}></i>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Daily Track</p>
            <p className={`text-2xl font-mono font-bold transition-colors ${isCurrentlyIn ? 'text-emerald-600' : 'text-slate-800'}`}>
              {formatSeconds(dailySeconds)}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 overflow-hidden">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-cake-candles"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500 font-medium">Birthdays Today</p>
            <div className="flex flex-col mt-1 gap-1">
              {birthdaysToday.length > 0 ? birthdaysToday.map(b => (
                <div key={b.id} className="flex items-center gap-2 group">
                  <img src={resolveAvatarUrl(b.avatar)} className="w-6 h-6 rounded-full border border-slate-100 object-cover" title={b.name} />
                  <span className="text-xs font-bold text-slate-700 truncate group-hover:text-primary-600 transition-colors">{b.name}</span>
                </div>
              )) : <p className="text-xs text-slate-400 italic">None today</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Attendance Summary</h3>
            <Link to="/attendance" className="text-xs font-black uppercase text-primary-600 hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Times</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userRecords.slice(0, 5).map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-700">{att.date}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">{att.checkIn} - {att.checkOut || '--:--'}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-800">{formatSeconds(att.accumulatedTime || 0)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase bg-primary-50 text-primary-600 px-2 py-0.5 rounded">
                          {att.location || 'Remote'}
                        </span>
                        {att.latitude && <i className="fas fa-shield-check text-emerald-500 text-[10px]" title="GPS Verified"></i>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Pending Requests</h3>
              <span className="bg-amber-50 text-amber-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{pendingRequests.length}</span>
            </div>
            <div className="space-y-4">
              {pendingRequests.length > 0 ? pendingRequests.slice(0, 3).map(req => (
                <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-slate-800">{isApprover ? req.userName : req.type}</p>
                    <span className="text-[9px] font-black text-amber-500 uppercase">{req.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{req.startDate} to {req.endDate}</p>
                  <div className="mt-2 flex justify-end">
                    <Link to={isApprover ? "/approvals" : "/leave"} className="text-[10px] font-bold text-primary-600 hover:underline">
                      {isApprover ? 'Review Now' : 'Track Status'}
                    </Link>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6 text-slate-400 italic text-xs">No pending requests</div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
              Who's Out Today
              <span className="bg-primary-50 text-primary-600 text-[10px] px-2 py-0.5 rounded-full">{whosOutToday.length}</span>
            </h3>
            <div className="space-y-4">
              {whosOutToday.slice(0, 5).map(({ user: e, status, type }) => (
                <div key={e.id} className="flex items-center justify-between gap-3 p-1">
                  <div className="flex items-center gap-3">
                    <img src={resolveAvatarUrl(e.avatar)} className="w-8 h-8 rounded-full object-cover border border-slate-100" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{e.name}</p>
                      <p className="text-[10px] text-slate-400">{e.department}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all ${
                    type === 'leave' 
                      ? 'bg-amber-50 text-amber-600 border-amber-100' 
                      : type === 'logged-out'
                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showLocationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-primary-50 text-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl shadow-lg shadow-primary-100">
                <i className="fas fa-map-location-dot"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Select Your Location</h3>
              <p className="text-slate-500 mb-6 font-medium">Clock-in will capture your current coordinates.</p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-10 text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                <i className="fas fa-shield-halved mr-2 text-primary-500"></i>
                Privacy Consent: By clicking a location, you consent to NexusHR recording your GPS coordinates for attendance verification purposes.
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                {['Office', 'Home', 'Client Site'].map(loc => {
                  const conf = getLocationConfig(loc);
                  return (
                    <button 
                      key={loc} 
                      onClick={() => handleLocationSelect(loc)} 
                      className={`p-8 border-2 rounded-[32px] flex flex-col items-center gap-4 transition-all hover:-translate-y-1 active:scale-95 group ${conf.button}`}
                    >
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/40 shadow-sm transition-all group-hover:bg-white group-hover:scale-105">
                        <i className={`fas ${getLocationIcon(loc)} text-xl transition-colors ${conf.icon}`}></i>
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest leading-none">{loc}</span>
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => setShowLocationModal(false)} 
                className="text-slate-400 text-sm font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showLateReasonModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6 text-2xl"><i className="fas fa-clock-rotate-left"></i></div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Punctuality Alert</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">Please provide a brief reason for logging in after the grace period.</p>
              <form onSubmit={handleLateReasonSubmit} className="space-y-4">
                <textarea autoFocus required placeholder="e.g. Heavy traffic..." value={lateReason} onChange={(e) => setLateReason(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 font-medium text-slate-700 min-h-[100px] resize-none" />
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowLateReasonModal(false); setShowLocationModal(true); }} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl">Back</button>
                  <button type="submit" className="flex-[2] py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all active:scale-[0.98]">Submit & Clock In</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, Attendance, LeaveRequest, LeaveStatus, 
  Holiday, SystemConfig, Notification, LeaveBalance, LeaveType,
  Project, TimesheetEntry, TimesheetPeriod, TimesheetStatus
} from '../types';
import { userService } from '../services/userService';
import { attendanceService } from '../services/attendanceService';
import { leaveService } from '../services/leaveService';
import { systemService } from '../services/systemService';
import { MOCK_USERS, INITIAL_LEAVE_REQUESTS } from '../constants';

const SESSION_KEY = 'nexushr_active_session';
const CACHE_KEY = 'nexushr_offline_cache';

const DEFAULT_CONFIG: SystemConfig = {
  companyName: "NexusHR Systems",
  companyDomain: "nexushr.com",
  timezone: "UTC+5:30 (IST)",
  workStartTime: "10:00",
  workEndTime: "19:00",
  gracePeriodMinutes: 15,
  defaultAnnualLeave: 21,
  defaultSickLeave: 12,
  defaultCasualLeave: 10,
  currency: "INR"
};

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Nexus Cloud Migration', client: 'Internal', status: 'Active' },
  { id: 'p2', name: 'FinTech App Development', client: 'Alpha Bank', status: 'Active' },
  { id: 'p3', name: 'Security Audit Q2', client: 'Beta Corp', status: 'On Hold' }
];

const getISODate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getISOTime = () => new Date().toTimeString().split(' ')[0];

const parseTimeOnDate = (dateStr: string, timeStr: string): Date | null => {
  if (!dateStr || !timeStr || timeStr === '00:00:00' || timeStr === 'null' || timeStr === '--:--' || timeStr === '') return null;
  const d = new Date(`${dateStr.replace(/-/g, '/')} ${timeStr}`);
  return isNaN(d.getTime()) ? null : d;
};

const computeLeaveDuration = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return isNaN(diffDays) ? 0 : diffDays;
};

export const useHRSystem = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isServerOffline, setIsServerOffline] = useState(false);
  
  const [employees, setEmployees] = useState<User[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(DEFAULT_CONFIG);

  const [projects] = useState<Project[]>(MOCK_PROJECTS);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  const [timesheetPeriods, setTimesheetPeriods] = useState<TimesheetPeriod[]>([]);

  // Use a ref to prevent overlapping sync operations that cause UI flickering
  const syncInProgress = useRef(false);

  const saveToCache = (data: any) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ...data,
      timestamp: Date.now()
    }));
  };

  const loadFromCache = () => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  };

  const loadData = useCallback(async (forceSync = false) => {
    if (syncInProgress.current && !forceSync) return;
    
    syncInProgress.current = true;
    setIsSyncing(true);
    
    try {
      const isOnline = await systemService.checkHealth();
      setIsServerOffline(!isOnline);
      
      if (isOnline) {
        const [users, att, leaves, holds, config, balances] = await Promise.all([
          userService.getUsers(),
          attendanceService.getAttendance(),
          leaveService.getLeaves(),
          systemService.getHolidays(),
          systemService.getConfig(),
          leaveService.getBalances()
        ]);

        const currentConfig = config || DEFAULT_CONFIG;
        const currentLeaves = leaves || [];
        const currentHolidays = (holds || []).filter(h => h.frzInd !== true);
        
        const accurateBalances = [...(balances || [])];
        (users || []).forEach(emp => {
          [LeaveType.EARNED, LeaveType.SICK, LeaveType.CASUAL].forEach(type => {
            const exists = accurateBalances.find(b => String(b.userId) === String(emp.id) && b.type === type);
            if (!exists) {
              accurateBalances.push({
                userId: emp.id,
                type,
                total: type === LeaveType.EARNED ? currentConfig.defaultAnnualLeave : 
                       type === LeaveType.SICK ? currentConfig.defaultSickLeave : 
                       currentConfig.defaultCasualLeave,
                used: 0
              });
            }
          });
        });

        setEmployees(users || []);
        setAttendances(att || []);
        setLeaveRequests(currentLeaves);
        setHolidays(currentHolidays);
        setSystemConfig(currentConfig);
        setLeaveBalances(accurateBalances);

        // Load timesheets from local storage (currently local-first)
        const localTS = localStorage.getItem('nexushr_timesheet_data');
        if (localTS) {
           const parsed = JSON.parse(localTS);
           setTimesheetEntries(parsed.entries || []);
           setTimesheetPeriods(parsed.periods || []);
        }

        saveToCache({
          employees: users || [],
          attendances: att || [],
          leaveRequests: currentLeaves,
          holidays: currentHolidays,
          systemConfig: currentConfig,
          leaveBalances: accurateBalances,
          projects,
          timesheetEntries,
          timesheetPeriods
        });

        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
          const localUser = JSON.parse(savedSession);
          const freshUser = (users || []).find(u => String(u.id) === String(localUser.id));
          if (freshUser) {
            setCurrentUser(freshUser);
            localStorage.setItem(SESSION_KEY, JSON.stringify(freshUser));
          }
        }
      } else {
        throw new Error("Server reporting offline status");
      }
    } catch (error) {
      console.warn("⚠️ Sync Note: Operating in local/cache mode.");
      setIsServerOffline(true);
      
      const cached = loadFromCache();
      const fallbackData = cached || {
        employees: MOCK_USERS,
        attendances: [],
        leaveRequests: INITIAL_LEAVE_REQUESTS,
        holidays: [],
        systemConfig: DEFAULT_CONFIG,
        leaveBalances: [],
        projects: MOCK_PROJECTS,
        timesheetEntries: [],
        timesheetPeriods: []
      };

      setEmployees(fallbackData.employees);
      setAttendances(fallbackData.attendances);
      setLeaveRequests(fallbackData.leaveRequests);
      setHolidays((fallbackData.holidays || []).filter((h: any) => h.frzInd !== true));
      setSystemConfig(fallbackData.systemConfig);
      setLeaveBalances(fallbackData.leaveBalances);
      setTimesheetEntries(fallbackData.timesheetEntries || []);
      setTimesheetPeriods(fallbackData.timesheetPeriods || []);

      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const localUser = JSON.parse(savedSession);
        const user = fallbackData.employees.find((u: any) => String(u.id) === String(localUser.id));
        if (user) setCurrentUser(user);
      }
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
      syncInProgress.current = false;
    }
    // We remove dependencies that are updated inside loadData to prevent infinite loops
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveTimesheetEntries = (entries: TimesheetEntry[], period: TimesheetPeriod) => {
    const updatedEntries = [...timesheetEntries.filter(e => e.userId !== period.userId || !entries.some(ne => ne.date === e.date)) , ...entries];
    const updatedPeriods = [...timesheetPeriods.filter(p => p.id !== period.id), period];
    
    setTimesheetEntries(updatedEntries);
    setTimesheetPeriods(updatedPeriods);
    
    localStorage.setItem('nexushr_timesheet_data', JSON.stringify({
       entries: updatedEntries,
       periods: updatedPeriods
    }));
  };

  const checkIn = async (location?: string, lateReason?: string, latitude?: number, longitude?: number) => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const todayStr = getISODate();
      const timeStr = getISOTime();
      const current = await attendanceService.getAttendance();
      const existingIdx = current.findIndex(a => 
        String(a.userId) === String(currentUser.id) && a.date === todayStr
      );

      if (existingIdx !== -1) {
        const existing = current[existingIdx];
        const coStr = String(existing.checkOut || '');
        const isCurrentlyActive = !coStr.includes(':') || coStr === '00:00:00' || coStr === 'null' || coStr === '';
        
        if (isCurrentlyActive) return;

        const resumedRecord: Attendance = {
          ...existing,
          checkOut: undefined,
          lastClockIn: timeStr,
          location: location || existing.location,
          latitude: latitude || existing.latitude,
          longitude: longitude || existing.longitude,
          lateReason: lateReason || existing.lateReason
        };
        current[existingIdx] = resumedRecord;
        await attendanceService.saveAttendance(current);
      } else {
        const newRecord: Attendance = { 
          id: Math.random().toString(36).substr(2, 9), 
          userId: currentUser.id, 
          date: todayStr, 
          checkIn: timeStr, 
          lastClockIn: timeStr,
          accumulatedTime: 0,
          location,
          latitude,
          longitude,
          lateReason
        };
        await attendanceService.saveAttendance([newRecord, ...current]);
      }
      await loadData(true);
    } catch (e) {
      console.error("Failed to sync check-in:", e);
      setIsSyncing(false);
    }
  };

  const checkOut = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const todayStr = getISODate();
      const timeStr = getISOTime();
      const current = await attendanceService.getAttendance();
      const activeIdx = current.findIndex(a => 
        String(a.userId) === String(currentUser.id) && 
        (!a.checkOut || a.checkOut === '00:00:00' || a.checkOut === 'null' || a.checkOut === '')
      );
      
      if (activeIdx === -1) return;
      
      const record = current[activeIdx];
      const start = parseTimeOnDate(record.date, record.lastClockIn || record.checkIn);
      const end = parseTimeOnDate(todayStr, timeStr);

      let diff = 0;
      if (start && end) diff = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
      
      const updatedRecord = { 
        ...record, 
        checkOut: timeStr, 
        accumulatedTime: (record.accumulatedTime || 0) + diff 
      };
      
      current[activeIdx] = updatedRecord;
      await attendanceService.saveAttendance(current);
      await loadData(true);
    } catch (e) {
      console.error("Failed to sync check-out:", e);
      setIsSyncing(false);
    }
  };

  const applyLeave = async (req: Partial<LeaveRequest>) => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const newReq: LeaveRequest = {
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        type: req.type || LeaveType.CASUAL,
        startDate: req.startDate || getISODate(),
        endDate: req.endDate || getISODate(),
        reason: req.reason || '',
        status: LeaveStatus.PENDING,
        appliedDate: getISODate(),
      };
      const current = await leaveService.getLeaves();
      await leaveService.saveLeaves([newReq, ...current]);
      await loadData(true);
    } catch (e) {
      console.error("Failed to apply leave:", e);
      setIsSyncing(false);
    }
  };

  const updateLeaveStatus = async (id: string, status: LeaveStatus, processedBy?: string) => {
    setIsSyncing(true);
    try {
      const currentRequests = await leaveService.getLeaves();
      const reqIdx = currentRequests.findIndex(r => r.id === id);
      if (reqIdx === -1) return;
      
      const request = currentRequests[reqIdx];
      currentRequests[reqIdx] = {
        ...request,
        status,
        processedBy,
        processedDate: getISODate()
      };
      await leaveService.saveLeaves(currentRequests);

      if (status === LeaveStatus.APPROVED || request.status === LeaveStatus.APPROVED) {
          const currentBalances = await leaveService.getBalances();
          const accurateBalances = currentBalances.map(bal => {
            const approvedHistory = currentRequests.filter(r => 
              String(r.userId) === String(bal.userId) && 
              r.type === bal.type && 
              r.status === LeaveStatus.APPROVED
            );
            const totalUsed = approvedHistory.reduce((sum, req) => {
              return sum + computeLeaveDuration(req.startDate, req.endDate);
            }, 0);
            return { ...bal, used: totalUsed };
          });
          await leaveService.saveBalances(accurateBalances);
      }
      await loadData(true);
    } catch (e) {
      console.error("Failed to update leave status:", e);
      setIsSyncing(false);
    }
  };

  const handleUpdateEmployees = async (action: (prev: User[]) => User[]) => {
    setIsSyncing(true);
    const next = action(employees);
    setEmployees(next);
    try {
      await userService.saveUsers(next);
      await loadData(true);
    } catch (e) {
      console.error("Sync failed:", e);
      setIsSyncing(false);
    }
    return true;
  };

  const handleUpdateUser = async (user: User) => {
    setIsSyncing(true);
    const next = employees.map(e => e.id === user.id ? user : e);
    setEmployees(next);
    if (user.id === currentUser?.id) setCurrentUser(user);
    try {
      await userService.saveUsers(next);
      await loadData(true);
    } catch (e) {
       console.error("Sync failed:", e);
       setIsSyncing(false);
    }
  };

  const handleUpdateLeaveBalances = async (userId: string, updates: Partial<Record<LeaveType, number>>) => {
    setIsSyncing(true);
    const current = [...leaveBalances];
    Object.entries(updates).forEach(([type, total]) => {
      const idx = current.findIndex(b => String(b.userId) === String(userId) && b.type === type);
      if (idx !== -1) {
        current[idx] = { ...current[idx], total: Number(total) };
      } else {
        current.push({ userId, type: type as LeaveType, total: Number(total), used: 0 });
      }
    });
    setLeaveBalances(current);
    try {
      await leaveService.saveBalances(current);
      await loadData(true);
    } catch (e) {
       console.error("Sync failed:", e);
       setIsSyncing(false);
    }
  };

  const handleAddHoliday = async (h: Omit<Holiday, 'id'>) => {
    setIsSyncing(true);
    try {
      const newHoliday: Holiday = {
        id: Math.random().toString(36).substr(2, 9),
        frzInd: false,
        ...h
      };
      const current = await systemService.getHolidays();
      await systemService.saveHolidays([...current, newHoliday]);
      await loadData(true);
    } catch (e) {
      console.error("Failed to add holiday:", e);
      setIsSyncing(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    setIsSyncing(true);
    try {
      const current = await systemService.getHolidays();
      const updated = current.map(h => 
        String(h.id) === String(id) ? { ...h, frzInd: true } : h
      );
      await systemService.saveHolidays(updated);
      await loadData(true);
    } catch (e) {
      console.error("Failed to delete holiday:", e);
      setIsSyncing(false);
    }
  };

  const handleBroadcast = async (title: string, message: string, type: Notification['type']) => {
    setIsSyncing(true);
    try {
      const newNotifs: Notification[] = employees.map(emp => ({
        id: Math.random().toString(36).substr(2, 9),
        userId: emp.id,
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
        isRead: false
      }));
      
      const existing = await systemService.getNotifications();
      await systemService.saveNotifications([...newNotifs, ...existing]);
      await loadData(true);
    } catch (e) {
      setIsSyncing(false);
    }
  };

  const handleLogin = (email: string, password?: string) => {
    const user = employees.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || (password && user.password && user.password !== password)) return false;
    setCurrentUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    loadData(true);
    return true;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    window.location.reload();
  };

  const onUpdateConfig = async (config: SystemConfig) => {
    setIsSyncing(true);
    setSystemConfig(config);
    try {
      await systemService.saveConfig(config);
      await loadData(true);
    } catch (e) {
      console.error("Failed to save config:", e);
      setIsSyncing(false);
    }
  };

  return {
    currentUser, isLoading, isSyncing, isServerOffline,
    employees, setEmployees: handleUpdateEmployees, attendances, leaveRequests, leaveBalances, holidays, systemConfig,
    projects, timesheetEntries, timesheetPeriods, saveTimesheetEntries,
    checkIn, checkOut, applyLeave, updateLeaveStatus, handleUpdateUser, handleLogin,
    onBroadcast: handleBroadcast,
    onUpdateLeaveBalances: handleUpdateLeaveBalances,
    onAddHoliday: handleAddHoliday,
    onDeleteHoliday: handleDeleteHoliday,
    handleLogout,
    onUpdateConfig
  };
};

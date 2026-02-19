
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  User, Attendance, LeaveRequest, LeaveStatus, 
  Holiday, SystemConfig, Notification, LeaveBalance, LeaveType,
  Project, TimesheetEntry, TimesheetPeriod, TimesheetStatus,
  RosterAssignment, Goal, PerformanceReview, PerformanceFeedback,
  GoalPriority, GoalStatus,
  SalaryStructure, ExpenseRequest, BonusIncrement, PayrollRun, ExpenseStatus, SalaryComponent
} from '../types';
import { userService } from '../services/userService';
import { attendanceService } from '../services/attendanceService';
import { leaveService } from '../services/leaveService';
import { systemService } from '../services/systemService';
import { performanceService } from '../services/performanceService';
import { payrollService } from '../services/payrollService';
import { MOCK_USERS, INITIAL_LEAVE_REQUESTS } from '../constants';

const SESSION_KEY = 'nexushr_active_session';
const CACHE_KEY = 'nexushr_offline_cache';

const DEFAULT_CONFIG: SystemConfig = {
  companyName: "MyHR Systems",
  companyDomain: "myhr.com",
  timezone: "UTC+5:30 (IST)",
  workStartTime: "10:00",
  workEndTime: "19:00",
  gracePeriodMinutes: 15,
  defaultAnnualLeave: 21,
  defaultSickLeave: 12,
  defaultCasualLeave: 10,
  currency: "INR",
  schedulingMode: 'FIXED_SHIFT',
  salaryComponents: [] // No longer used from config
};

const getISODate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getISOTime = () => new Date().toTimeString().split(' ')[0];

const parseTimeOnDate = (dateStr: string, timeStr: string): Date | null => {
  if (!dateStr || !timeStr || typeof dateStr !== 'string' || timeStr === '00:00:00' || timeStr === 'null' || timeStr === '--:--' || timeStr === '') return null;
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
  const [rosters, setRosters] = useState<RosterAssignment[]>([]);
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
  const [feedback, setFeedback] = useState<PerformanceFeedback[]>([]);

  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [bonuses, setBonuses] = useState<BonusIncrement[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);

  const [projects] = useState<Project[]>([]);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  const [timesheetPeriods, setTimesheetPeriods] = useState<TimesheetPeriod[]>([]);

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
        const [
          users, att, leaves, holds, config, balances, rost, 
          perfGoals, perfReviews, perfFeedback,
          salStructs, exps, bns, pyRuns
        ] = await Promise.all([
          userService.getUsers(),
          attendanceService.getAttendance(),
          leaveService.getLeaves(),
          systemService.getHolidays(),
          systemService.getConfig(),
          leaveService.getBalances(),
          systemService.getRosters(),
          performanceService.getGoals(),
          performanceService.getReviews(),
          performanceService.getFeedback(),
          payrollService.getSalaryStructures(),
          payrollService.getExpenses(),
          payrollService.getBonusIncrements(),
          payrollService.getPayrollRuns()
        ]);

        let currentConfig = { ...DEFAULT_CONFIG, ...(config || {}) };
        
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
        setRosters(rost || []);
        setGoals(perfGoals || []);
        setPerformanceReviews(perfReviews || []);
        setFeedback(perfFeedback || []);
        setSalaryStructures(salStructs || []);
        setExpenses(exps || []);
        setBonuses(bns || []);
        setPayrollRuns(pyRuns || []);

        saveToCache({
          employees: users || [],
          attendances: att || [],
          leaveRequests: currentLeaves,
          holidays: currentHolidays,
          systemConfig: currentConfig,
          leaveBalances: accurateBalances,
          rosters: rost || [],
          goals: perfGoals || [],
          performanceReviews: perfReviews || [],
          feedback: perfFeedback || [],
          salaryStructures: salStructs || [],
          expenses: exps || [],
          bonuses: bns || [],
          payrollRuns: pyRuns || []
        });

        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
          const localUser = JSON.parse(savedSession);
          const freshUser = (users || []).find(u => String(u.id) === String(localUser.id));
          if (freshUser) {
            const userWithToken = { ...freshUser, token: localUser.token };
            setCurrentUser(userWithToken);
            localStorage.setItem(SESSION_KEY, JSON.stringify(userWithToken));
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
        timesheetEntries: [],
        timesheetPeriods: [],
        rosters: [],
        goals: [],
        performanceReviews: [],
        feedback: [],
        salaryStructures: [],
        expenses: [],
        bonuses: [],
        payrollRuns: []
      };

      setEmployees(fallbackData.employees);
      setAttendances(fallbackData.attendances);
      setLeaveRequests(fallbackData.leaveRequests);
      setHolidays((fallbackData.holidays || []).filter((h: any) => h.frzInd !== true));
      setSystemConfig(fallbackData.systemConfig || DEFAULT_CONFIG);
      setLeaveBalances(fallbackData.leaveBalances);
      setRosters(fallbackData.rosters || []);
      setGoals(fallbackData.goals || []);
      setPerformanceReviews(fallbackData.performanceReviews || []);
      setFeedback(fallbackData.feedback || []);
      setSalaryStructures(fallbackData.salaryStructures || []);
      setExpenses(fallbackData.expenses || []);
      setBonuses(fallbackData.bonuses || []);
      setPayrollRuns(fallbackData.payrollRuns || []);

      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const localUser = JSON.parse(savedSession);
        const user = fallbackData.employees.find((u: any) => String(u.id) === String(localUser.id));
        if (user) setCurrentUser({ ...user, token: localUser.token });
      }
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateSalaryStructure = async (structure: SalaryStructure) => {
    setIsSyncing(true);
    try {
      const current = await payrollService.getSalaryStructures();
      const updated = [...current.filter(s => String(s.userId) !== String(structure.userId)), structure];
      await payrollService.saveSalaryStructures(updated);
      await loadData(true);
    } catch (e) {
      console.error("Salary structure update failed:", e);
      setIsSyncing(false);
    }
  };

  const handleAddExpense = async (expense: Partial<ExpenseRequest>) => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const newExp = {
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        category: expense.category || 'Other',
        amount: expense.amount || 0,
        date: expense.date || getISODate(),
        description: expense.description || '',
        status: ExpenseStatus.PENDING,
        ...expense
      } as ExpenseRequest;
      const current = await payrollService.getExpenses();
      await payrollService.saveExpenses([newExp, ...current]);
      await loadData(true);
    } catch (e) {
      console.error(e);
      setIsSyncing(false);
    }
  };

  const handleUpdateExpenseStatus = async (id: string, status: ExpenseStatus) => {
    setIsSyncing(true);
    try {
      const current = await payrollService.getExpenses();
      const updated = current.map(e => e.id === id ? { ...e, status, approvedBy: currentUser?.name } : e);
      await payrollService.saveExpenses(updated);
      await loadData(true);
    } catch (e) {
      console.error(e);
      setIsSyncing(false);
    }
  };

  const handleAddBonus = async (bonus: Partial<BonusIncrement>) => {
    setIsSyncing(true);
    try {
      const newB: BonusIncrement = {
        id: Math.random().toString(36).substr(2, 9),
        userId: bonus.userId || '',
        type: bonus.type || 'BONUS',
        amount: bonus.amount || 0,
        effectiveDate: bonus.effectiveDate || getISODate(),
        reason: bonus.reason || '',
        isProcessed: false
      };
      const current = await payrollService.getBonusIncrements();
      await payrollService.saveBonusIncrements([newB, ...current]);
      await loadData(true);
    } catch (e) {
      console.error(e);
      setIsSyncing(false);
    }
  };

  const handleRunPayroll = async (month: string, year: number, runs: PayrollRun[]) => {
    setIsSyncing(true);
    try {
      const current = await payrollService.getPayrollRuns();
      await payrollService.savePayrollRuns([...runs, ...current]);
      await loadData(true);
    } catch (e) {
      console.error(e);
      setIsSyncing(false);
    }
  };

  const saveRoster = async (assignments: RosterAssignment[]) => {
    setIsSyncing(true);
    try {
      await systemService.saveRosters(assignments);
      await loadData(true);
    } catch (e) {
      console.error("Failed to save roster:", e);
      setIsSyncing(false);
    }
  };

  const saveTimesheetEntries = async (newEntries: TimesheetEntry[], period: TimesheetPeriod) => {
    setIsSyncing(true);
    try {
      setTimesheetEntries(prev => {
        const filtered = prev.filter(e => !newEntries.some(ne => ne.date === e.date && ne.projectId === e.projectId));
        return [...filtered, ...newEntries];
      });
      setTimesheetPeriods(prev => {
        const filtered = prev.filter(p => p.id !== period.id);
        return [...filtered, period];
      });
      await loadData(true);
    } catch (e) {
      console.error("Failed to save timesheet entries:", e);
      setIsSyncing(false);
    }
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

        const lastCheckOut = parseTimeOnDate(existing.date, coStr);
        const newCheckIn = parseTimeOnDate(todayStr, timeStr);
        let breakDuration = 0;
        if (lastCheckOut && newCheckIn) {
          breakDuration = Math.max(0, Math.floor((newCheckIn.getTime() - lastCheckOut.getTime()) / 1000));
        }

        const resumedRecord: Attendance = {
          ...existing,
          checkOut: undefined,
          lastClockIn: timeStr,
          breakTime: (existing.breakTime || 0) + breakDuration,
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
          breakTime: 0,
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
        ccEmail: req.ccEmail || undefined
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
    const next = employees.map(e => String(e.id) === String(user.id) ? user : e);
    setEmployees(next);
    if (String(user.id) === String(currentUser?.id)) setCurrentUser({ ...user, token: currentUser?.token });
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
    const mockToken = `nx_auth_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    const userWithToken = { ...user, token: mockToken };
    setCurrentUser(userWithToken);
    localStorage.setItem(SESSION_KEY, JSON.stringify(userWithToken));
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

  const handleAddGoal = async (goal: Partial<Goal>) => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const newGoal: Goal = {
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        title: goal.title || 'Untitled Goal',
        description: goal.description || '',
        priority: goal.priority || GoalPriority.MEDIUM,
        status: goal.status || GoalStatus.ON_TRACK,
        progress: goal.progress || 0,
        dueDate: goal.dueDate || getISODate()
      };
      const current = await performanceService.getGoals();
      await performanceService.saveGoals([newGoal, ...current]);
      await loadData(true);
    } catch (e) {
      console.error("Failed to save goal:", e);
      setIsSyncing(false);
    }
  };

  const handleAddFeedback = async (fb: Partial<PerformanceFeedback>) => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const newFb: PerformanceFeedback = {
        id: Math.random().toString(36).substr(2, 9),
        userId: fb.userId || currentUser.id, 
        fromId: currentUser.id,
        fromName: currentUser.name,
        content: fb.content || '',
        date: getISODate(),
        category: fb.category || 'peer',
        rating: fb.rating || 5
      } as PerformanceFeedback;
      const current = await performanceService.getFeedback();
      await performanceService.saveFeedback([newFb, ...current]);
      await loadData(true);
    } catch (e) {
      console.error("Failed to save feedback:", e);
      setIsSyncing(false);
    }
  };

  const handleAddReview = async (review: Partial<PerformanceReview>) => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const newReview: PerformanceReview = {
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        reviewerId: review.reviewerId || '',
        cycle: review.cycle || 'Annual 2025',
        status: 'DRAFT',
        lastUpdated: new Date().toISOString(),
      };
      const current = await performanceService.getReviews();
      await performanceService.saveReviews([newReview, ...current]);
      await loadData(true);
    } catch (e) {
      console.error("Failed to request review:", e);
      setIsSyncing(false);
    }
  };

  return {
    currentUser, isLoading, isSyncing, isServerOffline,
    employees, setEmployees: handleUpdateEmployees, attendances, leaveRequests, leaveBalances, holidays, systemConfig,
    rosters, saveRoster,
    projects, timesheetEntries, timesheetPeriods, saveTimesheetEntries,
    goals, performanceReviews, feedback,
    onAddGoal: handleAddGoal,
    onAddFeedback: handleAddFeedback,
    onAddReview: handleAddReview,
    salaryStructures, expenses, bonuses, payrollRuns,
    onUpdateSalaryStructure: handleUpdateSalaryStructure,
    onAddExpense: handleAddExpense,
    onUpdateExpenseStatus: handleUpdateExpenseStatus,
    onAddBonus: handleAddBonus,
    onRunPayroll: handleRunPayroll,
    checkIn, checkOut, applyLeave, updateLeaveStatus, handleUpdateUser, handleLogin,
    onBroadcast: handleBroadcast,
    onUpdateLeaveBalances: handleUpdateLeaveBalances,
    onAddHoliday: handleAddHoliday,
    onDeleteHoliday: handleDeleteHoliday,
    handleLogout,
    onUpdateConfig
  };
};


export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  HR = 'HR',
  ADMIN = 'ADMIN'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum LeaveType {
  SICK = 'SICK',
  CASUAL = 'CASUAL',
  EARNED = 'EARNED',
  MATERNITY = 'MATERNITY'
}

export enum TimesheetStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum GoalPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum GoalStatus {
  ON_TRACK = 'ON_TRACK',
  BEHIND = 'BEHIND',
  AT_RISK = 'AT_RISK',
  COMPLETED = 'COMPLETED'
}

export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID'
}

export interface SalaryComponent {
  id: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
}

export interface SalaryStructure {
  userId: string;
  basic?: number;
  hra?: number;
  attendanceBonus?: number;
  transportAllowance?: number;
  conveyanceAllowance?: number;
  medicalAllowance?: number;
  performanceIncentives?: number;
  internetAllowance?: number;
  pf?: number;
  tax?: number;
  pt?: number;
  components: Record<string, number>; // Maps custom componentId -> amount
  lastUpdated: string;
}

export interface ExpenseRequest {
  id: string;
  userId: string;
  userName: string;
  category: 'Travel' | 'Food' | 'Equipment' | 'Other';
  amount: number;
  date: string;
  description: string;
  receiptUrl?: string;
  status: ExpenseStatus;
  approvedBy?: string;
}

export interface BonusIncrement {
  id: string;
  userId: string;
  type: 'BONUS' | 'INCREMENT' | 'ONE_TIME';
  amount: number;
  effectiveDate: string;
  reason: string;
  isProcessed: boolean;
}

export interface PayrollRun {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  year: number;
  grossSalary: number;
  netSalary: number;
  deductions: number;
  reimbursements: number;
  bonus: number;
  status: 'DRAFT' | 'PAID';
  processedDate?: string;
  attendanceDays: number;
  componentBreakdown?: Record<string, number>; // Snapshot of components at run time
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  priority: GoalPriority;
  status: GoalStatus;
  progress: number;
  dueDate: string;
}

export interface PerformanceReview {
  id: string;
  userId: string;
  reviewerId: string;
  cycle: string;
  status: 'DRAFT' | 'SUBMITTED' | 'FINALIZED';
  selfRating?: number;
  managerRating?: number;
  comments?: string;
  lastUpdated: string;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

export interface RosterAssignment {
  id: string;
  userId: string;
  date: string;
  shiftId: string;
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: 'Active' | 'Completed' | 'On Hold';
}

export interface TimesheetEntry {
  id: string;
  userId: string;
  projectId: string;
  date: string;
  hours: number;
  description?: string;
}

export interface TimesheetPeriod {
  id: string;
  userId: string;
  startDate: string;
  status: TimesheetStatus;
  submittedAt?: string;
  approvedBy?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string; 
  ifscCode: string;
  panNumber?: string;
  socialSecurityNumber?: string;
  uanNumber?: string;
  pfNumber?: string;
}

export interface UserDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadDate: string;
}

export interface NotificationPreference {
  attendanceReminders: boolean;
  leaveUpdates: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  channels: { inApp: boolean; email: boolean; };
}

export interface PerformanceFeedback {
  id: string;
  userId: string;
  fromId: string;
  fromName: string;
  content: string;
  date: string;
  category: 'peer' | 'manager' | 'self';
  rating: number;
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  password?: string;
  token?: string;
  role: UserRole;
  department: string;
  managerId?: string;
  avatar: string;
  joinDate: string;
  shiftStart: string;
  shiftEnd: string;
  notificationPreferences?: NotificationPreference;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  bloodGroup?: string;
  personalEmail?: string;
  contactNumber?: string;
  emergencyContact?: EmergencyContact;
  currentAddress?: Address;
  permanentAddress?: Address;
  jobTitle?: string;
  employmentType?: string; 
  probationEndDate?: string;
  workLocation?: string;
  employeeStatus?: 'Active' | 'On Leave' | 'Terminated';
  bankDetails?: BankDetails;
  payrollCycle?: string;
  payGrade?: string;
  documents?: UserDocument[];
  highestQualification?: string;
  certifications?: string[];
  skills?: string[];
  languages?: string[];
  totalExperience?: string;
  priorExperience?: string;
  lastLogin?: string;
  twoFactorEnabled?: boolean;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  accumulatedTime?: number;
  breakTime?: number;
  lastClockIn?: string;
  lateReason?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  appliedDate: string;
  processedBy?: string;
  processedDate?: string;
  ccEmail?: string;
}

export interface LeaveBalance {
  userId: string;
  type: LeaveType;
  total: number;
  used: number;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  frzInd?: boolean; 
}

export interface SystemConfig {
  companyName: string;
  companyDomain: string;
  timezone: string;
  workStartTime: string;
  workEndTime: string;
  gracePeriodMinutes: number;
  defaultAnnualLeave: number;
  defaultSickLeave: number;
  defaultCasualLeave: number;
  currency: string;
  schedulingMode: 'FIXED_SHIFT' | 'WEEKLY_ROSTER';
  salaryComponents: SalaryComponent[];
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  isRead: boolean;
}

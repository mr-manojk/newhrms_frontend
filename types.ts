
export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  HR = 'HR',
  ADMIN = 'ADMIN'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
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
  date: string; // YYYY-MM-DD
  hours: number;
  description?: string;
}

export interface TimesheetPeriod {
  id: string;
  userId: string;
  startDate: string; // Monday of the week
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
  announcements: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  channels: {
    inApp: boolean;
    email: boolean;
  };
}

export interface PerformanceFeedback {
  id: string;
  fromId: string;
  fromName: string;
  content: string;
  date: string;
  category: 'peer' | 'manager' | 'self';
  rating: number; // 1-5
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  password?: string;
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
  githubRepo?: string;
  githubToken?: string;
  lastGithubSync?: string;
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
  link?: string;
}

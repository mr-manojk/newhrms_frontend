
import { User, UserRole, LeaveType, LeaveStatus, LeaveRequest } from './types';

const today = new Date().toISOString().split('T')[0];

export const MOCK_USERS: User[] = [
  {
    id: '1',
    employeeId: 'NEX-1001',
    name: 'Sarah Chen',
    email: 'sarah.c@nexushr.com',
    password: 'password',
    role: UserRole.ADMIN,
    department: 'Executive',
    avatar: 'https://i.pravatar.cc/150?u=sarah',
    joinDate: '2022-01-15',
    shiftStart: '09:00',
    shiftEnd: '18:00'
  },
  {
    id: '2',
    employeeId: 'NEX-1002',
    name: 'James Wilson',
    email: 'james.w@nexushr.com',
    password: 'password',
    role: UserRole.MANAGER,
    department: 'Engineering',
    managerId: '1',
    avatar: 'https://i.pravatar.cc/150?u=james',
    joinDate: '2022-03-20',
    shiftStart: '10:00',
    shiftEnd: '19:00'
  },
  {
    id: '3',
    employeeId: 'NEX-1003',
    name: 'Emily Davis',
    email: 'emily.d@nexushr.com',
    password: 'password',
    role: UserRole.EMPLOYEE,
    department: 'Engineering',
    managerId: '2',
    avatar: 'https://i.pravatar.cc/150?u=emily',
    joinDate: '2023-06-10',
    shiftStart: '08:30',
    shiftEnd: '17:30'
  },
  {
    id: '4',
    employeeId: 'NEX-1004',
    name: 'Marcus Thorne',
    email: 'marcus.t@nexushr.com',
    password: 'password',
    role: UserRole.HR,
    department: 'People & Culture',
    managerId: '1',
    avatar: 'https://i.pravatar.cc/150?u=marcus',
    joinDate: '2023-01-05',
    shiftStart: '09:00',
    shiftEnd: '18:00'
  },
  {
    id: '5',
    employeeId: 'NEX-1005',
    name: 'Lily Zhang',
    email: 'lily.z@nexushr.com',
    password: 'password',
    role: UserRole.EMPLOYEE,
    department: 'Engineering',
    managerId: '2',
    avatar: 'https://i.pravatar.cc/150?u=lily',
    joinDate: '2024-02-15',
    shiftStart: '11:00',
    shiftEnd: '20:00'
  },
  {
    id: '6',
    employeeId: 'NEX-1006',
    name: 'Manoj Kumar',
    email: 'manoj.k@nexushr.com',
    password: 'password',
    role: UserRole.EMPLOYEE,
    department: 'IT',
    managerId: '2',
    avatar: 'https://i.pravatar.cc/150?u=manoj',
    joinDate: '2023-11-12',
    shiftStart: '09:30',
    shiftEnd: '18:30'
  }
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'lr_manoj',
    userId: '6',
    userName: 'Manoj Kumar',
    type: LeaveType.CASUAL,
    startDate: today,
    endDate: today,
    reason: 'Personal errands',
    status: LeaveStatus.APPROVED,
    appliedDate: today
  },
  {
    id: 'lr1',
    userId: '3',
    userName: 'Emily Davis',
    type: LeaveType.CASUAL,
    startDate: '2024-05-20',
    endDate: '2024-05-21',
    reason: 'Family event',
    status: LeaveStatus.APPROVED,
    appliedDate: '2024-05-15'
  },
  {
    id: 'lr2',
    userId: '3',
    userName: 'Emily Davis',
    type: LeaveType.SICK,
    startDate: '2024-06-01',
    endDate: '2024-06-02',
    reason: 'Fever',
    status: LeaveStatus.PENDING,
    appliedDate: '2024-05-28'
  },
  {
    id: 'lr3',
    userId: '5',
    userName: 'Lily Zhang',
    type: LeaveType.CASUAL,
    startDate: '2024-07-10',
    endDate: '2024-07-12',
    reason: 'Travel plans',
    status: LeaveStatus.PENDING,
    appliedDate: '2024-06-01'
  }
];

export const DEFAULT_SALARY_COMPONENTS: SalaryComponent[] = [
  { id: 'basic', name: 'Basic Salary', type: 'EARNING' },
  { id: 'hra', name: 'House Rent Allowance', type: 'EARNING' },
  { id: 'attendance_bonus', name: 'Attendance Bonus', type: 'EARNING' },
  { id: 'transport_allowance', name: 'Transport Allowance', type: 'EARNING' },
  { id: 'conveyance_allowance', name: 'Conveyance Allowance', type: 'EARNING' },
  { id: 'medical_allowance', name: 'Medical Allowance', type: 'EARNING' },
  { id: 'performance_incentives', name: 'Performance Incentives', type: 'EARNING' },
  { id: 'internet_allowance', name: 'Internet Allowance', type: 'EARNING' },
  { id: 'pf', name: 'Provident Fund', type: 'DEDUCTION' },
  { id: 'tax', name: 'Income Tax', type: 'DEDUCTION' },
  { id: 'pt', name: 'Professional Tax', type: 'DEDUCTION' }
];


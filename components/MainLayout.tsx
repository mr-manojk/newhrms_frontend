
import React, { useMemo } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { User, Attendance, LeaveRequest, UserRole, LeaveStatus } from '../types';
import { useNotifications } from '../hooks/useNotifications';

interface MainLayoutProps {
  user: User;
  employees: User[];
  attendances: Attendance[];
  leaveRequests: LeaveRequest[];
  isSyncing: boolean;
  isOffline: boolean;
  onLogout: () => void;
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  user, employees, attendances, leaveRequests, isSyncing, isOffline,
  onLogout, children
}) => {
  // Use the notification hook to get live data from database
  const { 
    notifications, 
    markAsRead, 
    clearAll 
  } = useNotifications(user);

  // Calculate pending approvals count for the sidebar badge
  const pendingApprovalsCount = useMemo(() => {
    if (!user || !leaveRequests) return 0;
    
    // Admin/HR see all organization-wide pending requests
    if (user.role === UserRole.ADMIN || user.role === UserRole.HR) {
      return leaveRequests.filter(r => r.status === LeaveStatus.PENDING && r.userId !== user.id).length;
    }
    
    // Managers see pending requests from their direct reports
    if (user.role === UserRole.MANAGER) {
      const directReportIds = employees.filter(e => e.managerId === user.id).map(e => e.id);
      return leaveRequests.filter(r => 
        r.status === LeaveStatus.PENDING && directReportIds.includes(r.userId)
      ).length;
    }

    return 0;
  }, [user, leaveRequests, employees]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        isOffline={isOffline} 
        pendingApprovalsCount={pendingApprovalsCount}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {isOffline && (
          <div className="bg-amber-500 text-white px-4 py-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg relative z-[60] animate-in slide-in-from-top duration-500">
            <i className="fas fa-wifi-slash"></i>
            <span>Offline Mode: Working on cached data. Backend unreachable.</span>
          </div>
        )}
        
        <Navbar 
          user={user} 
          employees={employees}
          attendances={attendances}
          leaveRequests={leaveRequests}
          notifications={notifications}
          onMarkRead={markAsRead}
          onClearAll={clearAll}
          isSyncing={isSyncing}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

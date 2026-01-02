
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import AttendancePage from './pages/AttendancePage';
import LeaveManagement from './pages/LeaveManagement';
import AdminPanel from './pages/AdminPanel';
import TeamPage from './pages/TeamPage';
import LoginPage from './pages/LoginPage';
import HolidaysPage from './pages/HolidaysPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import PerformancePage from './pages/PerformancePage';
import TimesheetsPage from './pages/TimesheetsPage';
import OrgChartPage from './pages/OrgChartPage';
import OnboardingTour from './components/OnboardingTour';
import { UserRole } from './types';
import { useHRSystem } from './hooks/useHRSystem';

const TOUR_KEY = 'nexushr_tour_completed';

const App: React.FC = () => {
  const {
    currentUser, isLoading, isSyncing, isServerOffline,
    employees, setEmployees, attendances, leaveRequests, leaveBalances, holidays, systemConfig,
    projects, timesheetEntries, timesheetPeriods, saveTimesheetEntries,
    checkIn, checkOut, applyLeave, updateLeaveStatus, handleUpdateUser, handleLogin, handleLogout, 
    onBroadcast, onUpdateLeaveBalances, onAddHoliday, onDeleteHoliday, onUpdateConfig
  } = useHRSystem();

  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const tourCompleted = localStorage.getItem(`${TOUR_KEY}_${currentUser.id}`);
      if (!tourCompleted) {
        const timer = setTimeout(() => setShowTour(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

  const handleTourComplete = () => {
    if (currentUser) {
      localStorage.setItem(`${TOUR_KEY}_${currentUser.id}`, 'true');
    }
    setShowTour(false);
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-bold tracking-tight">Establishing Secure Connection...</p>
    </div>
  );

  return (
    <HashRouter>
      {!currentUser ? (
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (
        <MainLayout 
          user={currentUser} 
          employees={employees} 
          attendances={attendances}
          leaveRequests={leaveRequests}
          isSyncing={isSyncing}
          isOffline={isServerOffline}
          onLogout={handleLogout}
        >
          <Routes>
            <Route path="/" element={<Dashboard user={currentUser} employees={employees} attendances={attendances} leaveRequests={leaveRequests} leaveBalances={leaveBalances} holidays={holidays} onCheckIn={checkIn} onCheckOut={checkOut} systemConfig={systemConfig} timesheetEntries={timesheetEntries} />} />
            <Route path="/attendance" element={<AttendancePage loggedInUser={currentUser} attendances={attendances} systemConfig={systemConfig} holidays={holidays} employees={employees} />} />
            <Route path="/attendance/:id" element={<AttendancePage loggedInUser={currentUser} attendances={attendances} systemConfig={systemConfig} holidays={holidays} employees={employees} />} />
            <Route path="/profile" element={<ProfilePage loggedInUser={currentUser} employees={employees} onUpdateUser={handleUpdateUser} />} />
            <Route path="/profile/:id" element={<ProfilePage loggedInUser={currentUser} employees={employees} onUpdateUser={handleUpdateUser} />} />
            <Route path="/leave" element={<LeaveManagement mode="requester" user={currentUser} employees={employees} leaveRequests={leaveRequests} onApply={applyLeave} onUpdateStatus={updateLeaveStatus} />} />
            <Route path="/approvals" element={<LeaveManagement mode="approver" user={currentUser} employees={employees} leaveRequests={leaveRequests} onApply={applyLeave} onUpdateStatus={updateLeaveStatus} />} />
            <Route path="/timesheets" element={<TimesheetsPage user={currentUser} projects={projects} entries={timesheetEntries} periods={timesheetPeriods} onSave={saveTimesheetEntries} />} />
            {/* Fix: Pass currentUser prop to OrgChartPage as required by its props definition */}
            <Route path="/org-chart" element={<OrgChartPage currentUser={currentUser} employees={employees} />} />
            <Route path="/performance" element={<PerformancePage user={currentUser} />} />
            <Route path="/team" element={<TeamPage user={currentUser} allEmployees={employees} />} />
            <Route path="/holidays" element={<HolidaysPage user={currentUser} holidays={holidays} onAddHoliday={onAddHoliday} onDeleteHoliday={onDeleteHoliday} />} />
            <Route path="/admin" element={currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HR ? <AdminPanel employees={employees} setEmployees={setEmployees as any} leaveBalances={leaveBalances} attendances={attendances} onUpdateLeaveBalances={onUpdateLeaveBalances} onBroadcast={onBroadcast} systemConfig={systemConfig} holidays={holidays} /> : <Navigate to="/" />} />
            <Route path="/settings" element={currentUser.role === UserRole.ADMIN ? <SettingsPage config={systemConfig} onUpdate={onUpdateConfig} /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </MainLayout>
      )}
      {showTour && <OnboardingTour onComplete={handleTourComplete} />}
    </HashRouter>
  );
};

export default App;

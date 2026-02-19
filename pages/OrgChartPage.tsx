
import React, { useMemo } from 'react';
import { User, UserRole, Attendance, LeaveRequest, LeaveStatus } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';
import { Link } from 'react-router-dom';

interface OrgChartPageProps {
  currentUser: User;
  employees: User[];
  attendances: Attendance[];
  leaveRequests: LeaveRequest[];
}

const OrgChartPage: React.FC<OrgChartPageProps> = ({ currentUser, employees, attendances, leaveRequests }) => {
  const canAccessProfile = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HR;

  // Current day string for matching data
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Determine node status class/color
  const getNodeStatusDot = (userId: string) => {
    // 1. Check Approved Leave
    const onLeave = (leaveRequests || []).some(lr => 
      String(lr.userId) === String(userId) && 
      lr.status === LeaveStatus.APPROVED && 
      todayStr >= lr.startDate && todayStr <= lr.endDate
    );
    if (onLeave) return 'bg-amber-500';

    // 2. Check Attendance
    const record = (attendances || []).find(a => 
      String(a.userId) === String(userId) && a.date === todayStr
    );

    if (!record) return 'bg-slate-300'; // Offline/Haven't started day
    
    const isCurrentlyIn = !record.checkOut || record.checkOut === '00:00:00' || record.checkOut === '' || record.checkOut === 'null';
    if (isCurrentlyIn) return 'bg-emerald-500 animate-pulse'; // Working now
    
    return 'bg-rose-500'; // Finished for the day
  };

  // Build hierarchy tree
  const tree = useMemo(() => {
    const map: Record<string, any> = {};
    const roots: any[] = [];

    employees.forEach(emp => {
      map[emp.id] = { ...emp, children: [] };
    });

    employees.forEach(emp => {
      if (emp.managerId && map[emp.managerId]) {
        map[emp.managerId].children.push(map[emp.id]);
      } else {
        roots.push(map[emp.id]);
      }
    });

    return roots;
  }, [employees]);

  const OrgNode: React.FC<{ node: any, isRoot?: boolean }> = ({ node, isRoot }) => {
    const statusDotClass = getNodeStatusDot(node.id);

    const nodeContent = (
      <div className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative z-10 transition-all ${
        canAccessProfile 
          ? 'hover:shadow-md hover:border-primary-400 hover:-translate-y-1 cursor-pointer group' 
          : 'cursor-default'
      } w-64`}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={resolveAvatarUrl(node.avatar)} 
              className="w-12 h-12 rounded-xl object-cover border-2 border-slate-50 shadow-sm" 
              alt="" 
            />
            <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${statusDotClass}`}></span>
          </div>
          <div className="overflow-hidden">
            <h4 className="font-bold text-slate-900 truncate text-sm leading-tight group-hover:text-primary-600 transition-colors">{node.name}</h4>
            <p className="text-[10px] text-primary-600 font-bold uppercase tracking-wider truncate mt-1">{node.jobTitle || node.role}</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Department</span>
            <span className="text-[10px] font-bold text-slate-700">{node.department || 'General'}</span>
          </div>
          
          {node.children.length > 0 && (
            <div className="bg-primary-50 px-2 py-1 rounded-lg border border-primary-100">
              <span className="text-[9px] font-black text-primary-700 uppercase tracking-tighter">
                {node.children.length} {node.children.length === 1 ? 'Report' : 'Reports'}
              </span>
            </div>
          )}
        </div>
      </div>
    );

    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          {canAccessProfile ? (
            <Link to={`/profile/${node.id}`} className="block">
              {nodeContent}
            </Link>
          ) : (
            nodeContent
          )}
          {node.children.length > 0 && (
            <div className="h-10 w-px bg-slate-200 mx-auto"></div>
          )}
        </div>

        {node.children.length > 0 && (
          <div className="relative pt-0">
            {/* Connecting Horizontal Line */}
            {node.children.length > 1 && (
                <div className="absolute top-0 left-[12%] right-[12%] h-px bg-slate-200"></div>
            )}
            <div className="flex gap-8 items-start">
              {node.children.map((child: any) => (
                <div key={child.id} className="relative pt-6">
                  {/* Vertical Stub to child */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-slate-200"></div>
                  <OrgNode node={child} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Structure</h1>
        <p className="text-sm text-slate-500 font-medium">Visual hierarchy of company reporting lines.</p>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-auto p-8 md:p-16 no-scrollbar bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px]">
        <div className="min-w-max mx-auto h-full flex flex-col items-center">
          {tree.length > 0 ? (
            tree.map(root => (
              <div key={root.id} className="mb-20">
                <OrgNode node={root} isRoot />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
                <i className="fas fa-sitemap text-4xl"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-800">No organizational data</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto mt-1">Please ensure employees and reporting lines are configured in the workforce manager.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Zoom/Navigation Legend */}
      <div className="flex justify-center gap-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Online Now</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Offline / Away</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">On Leave</span>
        </div>
      </div>
    </div>
  );
};

export default OrgChartPage;

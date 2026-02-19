
import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole, Attendance, LeaveRequest, LeaveStatus } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';

interface TeamPageProps {
  user: User;
  allEmployees: User[];
  attendances: Attendance[];
  leaveRequests: LeaveRequest[];
}

const TeamPage: React.FC<TeamPageProps> = ({ user, allEmployees, attendances, leaveRequests }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');

  const isManager = user.role === UserRole.MANAGER;
  const isAdminOrHR = user.role === UserRole.ADMIN || user.role === UserRole.HR;

  const baseList = useMemo(() => {
    if (isManager && !isAdminOrHR) {
      return allEmployees.filter(emp => emp.managerId === user.id);
    }
    return allEmployees;
  }, [allEmployees, user.id, isManager, isAdminOrHR]);

  const departments = useMemo(() => {
    const depts = new Set(allEmployees.map(e => e.department).filter(Boolean));
    return ['All', ...Array.from(depts)].sort();
  }, [allEmployees]);

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const getMemberStatus = useCallback((userId: string) => {
    // 1. Check for approved leave today
    const onLeave = (leaveRequests || []).some(lr => 
      String(lr.userId) === String(userId) && 
      lr.status === LeaveStatus.APPROVED && 
      todayStr >= lr.startDate && todayStr <= lr.endDate
    );

    if (onLeave) {
      return { 
        label: 'On Leave', 
        color: 'bg-amber-50 text-amber-600 border-amber-100', 
        dot: 'bg-amber-500' 
      };
    }

    // 2. Check for attendance today
    const record = (attendances || []).find(a => 
      String(a.userId) === String(userId) && a.date === todayStr
    );

    if (!record) {
      return { 
        label: 'Offline', 
        color: 'bg-slate-50 text-slate-400 border-slate-100', 
        dot: 'bg-slate-300' 
      };
    }

    const isCurrentlyIn = !record.checkOut || record.checkOut === '00:00:00' || record.checkOut === '' || record.checkOut === 'null';
    
    if (isCurrentlyIn) {
      return { 
        label: 'In', 
        color: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
        dot: 'bg-emerald-500 animate-pulse' 
      };
    }
    
    return { 
      label: 'Out', 
      color: 'bg-rose-50 text-rose-600 border-rose-100', 
      dot: 'bg-rose-500' 
    };
  }, [attendances, leaveRequests, todayStr]);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return baseList.filter(m => 
      (m.name.toLowerCase().includes(query) || 
       m.employeeId.toLowerCase().includes(query) || 
       m.jobTitle?.toLowerCase().includes(query)) &&
      (filterDept === 'All' || m.department === filterDept)
    );
  }, [baseList, searchQuery, filterDept]);

  const teamStats = useMemo(() => {
    const stats = filteredMembers.map(m => getMemberStatus(m.id));
    const activeCount = stats.filter(s => s.label === 'In').length;
    const depts = new Set(filteredMembers.map(m => m.department));
    return {
      total: filteredMembers.length,
      active: activeCount,
      departments: depts.size
    };
  }, [filteredMembers, getMemberStatus]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isManager && !isAdminOrHR ? 'My Direct Reports' : 'Organization Directory'}
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Managing {teamStats.total} members across {teamStats.departments} departments.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors"></i>
            <input 
              type="text" 
              placeholder="Search people..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-medium w-full sm:w-64 transition-all shadow-sm"
            />
          </div>
          <select 
            value={filterDept} 
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-600 shadow-sm appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
          >
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TeamStatCard 
          label="Total Members" 
          value={teamStats.total} 
          icon="fa-users" 
          color="primary" 
        />
        <TeamStatCard 
          label="Currently Working" 
          value={teamStats.active} 
          icon="fa-stopwatch-20" 
          color="emerald" 
        />
        <TeamStatCard 
          label="Business Units" 
          value={teamStats.departments} 
          icon="fa-network-wired" 
          color="amber" 
        />
      </div>

      {/* Members Grid */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMembers.map((member) => {
            const status = getMemberStatus(member.id);
            return (
              <div 
                key={member.id} 
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col relative overflow-hidden"
              >
                {/* Status Indicator Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${status.dot.split(' ')[0]}`}></div>
                
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative mb-4">
                    <img 
                      src={resolveAvatarUrl(member.avatar)} 
                      alt={member.name} 
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-50 shadow-sm" 
                    />
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${status.dot}`} title={status.label}></span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight group-hover:text-primary-600 transition-colors">{member.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-bold font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded uppercase tracking-widest">{member.employeeId}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-widest ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Position</span>
                    <span className="text-xs font-bold text-slate-700 text-right truncate max-w-[120px]">{member.jobTitle || member.role}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Department</span>
                    <span className="text-xs font-bold text-slate-700">{member.department}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Join Date</span>
                    <span className="text-xs font-semibold text-slate-500">{member.joinDate}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-8">
                  <a 
                    href={`mailto:${member.email}`} 
                    className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-primary-600 transition-all flex items-center justify-center shrink-0"
                    title="Send Email"
                  >
                    <i className="far fa-envelope"></i>
                  </a>
                  <button 
                    onClick={() => navigate(`/profile/${member.id}`)}
                    className="flex-1 py-2.5 bg-primary-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-primary-700 transition-all shadow-md active:scale-95"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-100 py-32 text-center animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-users-slash text-2xl text-slate-200"></i>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No matches found</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto font-medium">
            Try adjusting your search query or department filters to find who you're looking for.
          </p>
          <button 
            onClick={() => { setSearchQuery(''); setFilterDept('All'); }}
            className="mt-6 text-primary-600 font-bold text-[10px] uppercase tracking-widest hover:underline"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};

const TeamStatCard = ({ label, value, icon, color }: any) => {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-primary-100 transition-all">
      <div className={`w-10 h-10 ${colorMap[color] || 'bg-slate-100 text-slate-600'} rounded-xl flex items-center justify-center text-lg transition-transform group-hover:scale-105`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <h4 className="text-xl font-bold text-slate-800 leading-tight">{value}</h4>
      </div>
    </div>
  );
};

export default TeamPage;

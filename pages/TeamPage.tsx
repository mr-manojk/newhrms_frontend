
import React, { useMemo } from 'react';
import { User, UserRole } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';

interface TeamPageProps {
  user: User;
  allEmployees: User[];
}

const TeamPage: React.FC<TeamPageProps> = ({ user, allEmployees }) => {
  const teamMembers = useMemo(() => {
    // If Admin/HR, they can see everyone, but "My Team" usually implies hierarchy
    // We'll filter based on managerId
    return allEmployees.filter(emp => emp.managerId === user.id);
  }, [allEmployees, user.id]);

  const teamStats = useMemo(() => {
    const depts = new Set(teamMembers.map(m => m.department));
    return {
      count: teamMembers.length,
      deptCount: depts.size
    };
  }, [teamMembers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Team</h1>
          <p className="text-slate-500">Managing your {teamStats.count} direct reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-users"></i>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Team Size</p>
            <p className="text-2xl font-bold text-slate-800">{teamStats.count}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-network-wired"></i>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Departments</p>
            <p className="text-2xl font-bold text-slate-800">{teamStats.deptCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-chart-line"></i>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Engagement</p>
            <p className="text-2xl font-bold text-slate-800">High</p>
          </div>
        </div>
      </div>

      {teamMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <div key={member.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-4 mb-4">
                <img src={resolveAvatarUrl(member.avatar)} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-slate-100" />
                <div className="overflow-hidden">
                  <h3 className="font-bold text-slate-900 truncate">{member.name}</h3>
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{member.employeeId}</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Role</span>
                  <span className="font-bold text-slate-700">{member.role}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Unit</span>
                  <span className="font-bold text-slate-700">{member.department}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Joined</span>
                  <span className="font-semibold text-slate-700">{member.joinDate}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <a href={`mailto:${member.email}`} className="flex-1 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all text-center">
                  <i className="far fa-envelope mr-1.5"></i> Email
                </a>
                <button className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
                  Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-users-slash text-3xl text-slate-200"></i>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No direct reports found</h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            It looks like you don't have any team members assigned to you yet. 
            Admins can assign reporters in the Workforce panel.
          </p>
        </div>
      )}
    </div>
  );
};

export default TeamPage;

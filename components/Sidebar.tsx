
import React from 'react';
import { NavLink } from 'react-router-dom';
import { User, UserRole } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  isOffline?: boolean;
  pendingApprovalsCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, pendingApprovalsCount = 0 }) => {
  const isApprover = user.role === UserRole.MANAGER || user.role === UserRole.HR || user.role === UserRole.ADMIN;
  const canManageWorkforce = user.role === UserRole.HR || user.role === UserRole.ADMIN;
  const isAdmin = user.role === UserRole.ADMIN;
  const isManager = user.role === UserRole.MANAGER;

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-slate-900 text-white min-h-screen border-r border-slate-800">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-primary-600 p-2 rounded-lg text-white font-black text-xl shadow-lg shadow-primary-900/50">NX</div>
        <span className="text-xl font-bold tracking-tight">NexusHR</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 no-scrollbar">
        {/* Personal Space */}
        <div>
          <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">My Workspace</h3>
          <div className="space-y-1">
            <SidebarLink to="/" icon="fa-gauge" label="Dashboard" />
            <SidebarLink to="/profile" icon="fa-id-card" label="My Profile" />
            <SidebarLink id="tour-attendance-link" to="/attendance" icon="fa-clock" label="My Attendance" />
            <SidebarLink id="tour-leave-link" to="/leave" icon="fa-calendar-alt" label="My Leaves" />
            <SidebarLink to="/holidays" icon="fa-calendar-day" label="Holidays" />
          </div>
        </div>

        {/* Directory */}
        <div>
          <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Directory</h3>
          <div className="space-y-1">
            <SidebarLink to="/team" icon="fa-users" label={isManager ? "My Team" : "Team Directory"} />
            <SidebarLink to="/org-chart" icon="fa-sitemap" label="Org Structure" />
          </div>
        </div>

        {/* Management (Managers & Up) */}
        {isApprover && (
          <div>
            <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Management</h3>
            <div className="space-y-1">
              <SidebarLink 
                to="/approvals" 
                icon="fa-check-double" 
                label="Approvals" 
                badge={pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined}
              />
            </div>
          </div>
        )}

        {/* Organization (HR & Admins Only) */}
        {canManageWorkforce && (
          <div>
            <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Organization</h3>
            <div className="space-y-1">
              <SidebarLink to="/admin" icon="fa-building-user" label="Workforce" />
              {isAdmin && <SidebarLink to="/settings" icon="fa-gears" label="System Settings" />}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800 space-y-4">
        <div className="bg-slate-800/50 rounded-2xl p-3 flex items-center gap-3">
          <img src={resolveAvatarUrl(user.avatar)} className="w-8 h-8 rounded-full border border-slate-700 object-cover" alt="" />
          <div className="overflow-hidden text-left">
            <p className="text-xs font-bold truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase">{user.role}</p>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all font-semibold text-sm"
        >
          <i className="fas fa-sign-out-alt w-5"></i>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

const SidebarLink = ({ to, icon, label, id, badge }: { to: string, icon: string, label: string, id?: string, badge?: number }) => (
  <NavLink
    id={id}
    to={to}
    className={({ isActive }) => 
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm group ${
        isActive 
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`
    }
  >
    <i className={`fas ${icon} w-5`}></i>
    <span className="flex-1">{label}</span>
    {badge !== undefined && (
      <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-slate-900 group-hover:ring-slate-800 transition-all">
        {badge}
      </span>
    )}
  </NavLink>
);

export default Sidebar;

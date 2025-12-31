
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { User, Notification, Attendance, LeaveRequest, LeaveStatus } from '../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { resolveAvatarUrl } from '../services/apiClient';

interface NavbarProps {
  user: User;
  employees?: User[];
  attendances?: Attendance[];
  leaveRequests?: LeaveRequest[];
  notifications?: Notification[];
  onMarkRead?: (id: string) => void;
  onClearAll?: () => void;
  isSyncing?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  employees = [], 
  attendances = [],
  leaveRequests = [],
  notifications = [], 
  onMarkRead, 
  onClearAll, 
  isSyncing 
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Since the hook now strictly provides unread, notifications is the filtered list
  const unreadCount = notifications.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!location.pathname.includes('/admin')) {
      setSearchQuery('');
    }
  }, [location.pathname]);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const source = Array.isArray(employees) ? employees : [];
    
    return source.filter(emp => {
      if (!emp) return false;
      const nameMatch = (emp.name || '').toLowerCase().includes(query);
      const idMatch = (emp.employeeId || '').toLowerCase().includes(query);
      const deptMatch = (emp.department || '').toLowerCase().includes(query);
      return nameMatch || idMatch || deptMatch;
    }).slice(0, 5);
  }, [searchQuery, employees]);

  const getUserStatus = useCallback((userId: string) => {
    if (!userId) return { label: 'Unknown', color: 'bg-slate-50 text-slate-400 border-slate-100', dot: 'bg-slate-300' };
    
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    // Check for approved leave today
    const onLeave = (leaveRequests || []).some(lr => 
      String(lr.userId) === String(userId) && 
      lr.status === LeaveStatus.APPROVED && 
      todayStr >= lr.startDate && todayStr <= lr.endDate
    );

    if (onLeave) {
      return { 
        label: 'On Leave', 
        color: 'bg-amber-100 text-amber-700 border-amber-200', 
        dot: 'bg-amber-500 ring-2 ring-amber-500/20' 
      };
    }

    const record = (attendances || []).find(a => {
      if (!a || !a.date) return false;
      const recordDate = String(a.date).split('T')[0];
      return String(a.userId) === String(userId) && recordDate === todayStr;
    });

    if (!record) return { label: 'Offline', color: 'bg-slate-50 text-slate-400 border-slate-100', dot: 'bg-slate-300' };
    
    const isCurrentlyIn = !record.checkOut || record.checkOut === '00:00:00' || record.checkOut === '' || record.checkOut === 'null';
    
    if (isCurrentlyIn) {
      return { 
        label: 'Checked In', 
        color: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
        dot: 'bg-emerald-500 animate-pulse ring-2 ring-emerald-500/20' 
      };
    }
    
    return { 
      label: 'Logged Out', 
      color: 'bg-rose-50 text-rose-600 border-rose-100', 
      dot: 'bg-rose-500' 
    };
  }, [attendances, leaveRequests]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSearchResults(false);
    navigate(`/admin?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleResultClick = (empId: string) => {
    const source = Array.isArray(employees) ? employees : [];
    const emp = source.find(e => e.id === empId);
    setSearchQuery('');
    setShowSearchResults(false);
    if (emp) {
      navigate(`/admin?q=${encodeURIComponent(emp.name || '')}`);
    }
  };

  const formatTimestamp = (iso: string) => {
    if (!iso) return 'Unknown';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return 'Unknown';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (diffMs < 30000) return 'Just now';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  const getNotifIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'fa-check-circle text-emerald-500';
      case 'warning': return 'fa-exclamation-triangle text-amber-500';
      case 'error': return 'fa-times-circle text-rose-500';
      default: return 'fa-info-circle text-primary-500';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50">
      <div className="flex items-center gap-4 flex-1">
        <Link to="/" className="text-lg font-black text-primary-600 md:hidden">NX</Link>
        <div className="relative flex-1 max-w-md hidden md:block" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="bg-slate-100 px-4 py-2 rounded-xl flex items-center gap-2 group focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500/20 transition-all border border-transparent focus-within:border-primary-100">
            <i className={`fas fa-search ${searchQuery ? 'text-primary-500' : 'text-slate-400'} group-focus-within:text-primary-500`}></i>
            <input 
              type="text" 
              placeholder="Search people..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none text-slate-700 font-medium"
            />
          </form>
          {showSearchResults && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quick Matches</span>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {filteredResults.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {filteredResults.map(emp => {
                      const status = getUserStatus(emp.id);
                      return (
                        <button key={emp.id} onClick={() => handleResultClick(emp.id)} className="w-full p-3 flex items-center gap-3 hover:bg-primary-50/50 transition-colors text-left group">
                          <img src={resolveAvatarUrl(emp.avatar)} alt="" className="w-10 h-10 rounded-full border border-slate-100 object-cover" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-slate-800 group-hover:text-primary-600 transition-colors">{emp.name}</p>
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${status.color}`}>
                                  {status.label}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-500">{emp.department || 'No Department'}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 italic">No matches found for "{searchQuery}"</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        {isSyncing && (
          <div className="flex items-center gap-2 px-3 py-1 bg-primary-50/80 text-primary-600 rounded-full border border-primary-100/50 backdrop-blur-sm shadow-sm transition-all duration-300">
            <i className="fas fa-sync-alt fa-spin text-[10px]"></i>
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Syncing</span>
          </div>
        )}

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              showNotifications ? 'bg-primary-50 text-primary-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <i className="far fa-bell text-xl"></i>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-[calc(100vw-32px)] sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Unread Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => {
                        onClearAll?.();
                        setShowNotifications(false);
                      }} 
                      className="text-[10px] font-black uppercase text-primary-600 tracking-widest hover:text-primary-800"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Showing only unread alerts from database.</p>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((n) => (
                      <div 
                        key={n.id} 
                        onClick={() => {
                          onMarkRead?.(n.id);
                          // We don't necessarily close the dropdown, but the item will disappear because it's now read
                        }} 
                        className="p-4 flex gap-4 cursor-pointer hover:bg-slate-50 transition-colors bg-primary-50/40"
                      >
                        <div className="mt-1 shrink-0"><i className={`fas ${getNotifIcon(n.type)} text-lg`}></i></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h4 className="text-sm font-bold truncate text-primary-900">{n.title}</h4>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatTimestamp(n.timestamp)}</span>
                          </div>
                          <p className="text-xs leading-relaxed text-primary-700 font-medium">{n.message}</p>
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse"></span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-primary-500">Action Required</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 px-6 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-check-circle text-2xl text-emerald-400"></i>
                    </div>
                    <p className="text-slate-800 text-sm font-bold">You're all caught up!</p>
                    <p className="text-slate-500 text-xs mt-1">
                      No unread notifications at this time.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 leading-none">{user.name}</p>
            <p className="text-xs text-slate-500 mt-1">{user.role}</p>
          </div>
          <Link to="/profile">
            <img src={resolveAvatarUrl(user.avatar)} alt="" className="w-10 h-10 rounded-full border border-slate-200 object-cover" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

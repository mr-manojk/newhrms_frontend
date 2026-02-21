
import React, { useState, useMemo } from 'react';
import { User, UserRole, LeaveRequest, LeaveStatus, LeaveType, LeaveBalance } from '../types';
import ModalPortal from '../components/ModalPortal';

interface LeaveManagementProps {
  user: User;
  employees: User[];
  leaveRequests: LeaveRequest[];
  leaveBalances: LeaveBalance[];
  onApply: (req: Partial<LeaveRequest>) => void;
  onUpdateStatus: (id: string, status: LeaveStatus, processedByName?: string) => void;
  mode?: 'requester' | 'approver';
}

const LeaveManagement: React.FC<LeaveManagementProps> = ({ 
  user, 
  employees,
  leaveRequests, 
  leaveBalances,
  onApply, 
  onUpdateStatus, 
  mode = 'requester' 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [processing, setProcessing] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>(LeaveStatus.PENDING);
  const [formData, setFormData] = useState({
    type: LeaveType.CASUAL,
    startDate: '',
    endDate: '',
    days: 1,
    reason: '',
    ccEmail: ''
  });

  const isHRorAdmin = user.role === UserRole.ADMIN || user.role === UserRole.HR;
  const isManager = user.role === UserRole.MANAGER;
  const canFilterStatus = isHRorAdmin || isManager;

  const computeDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const myBalances = useMemo(() => {
    return leaveBalances.filter(b => String(b.userId) === String(user.id));
  }, [leaveBalances, user.id]);

  const getBalanceForType = (type: LeaveType) => {
    const bal = myBalances.find(b => b.type === type);
    return bal || { total: 0, used: 0 };
  };

  const handleStartDateChange = (val: string) => {
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      date.setDate(date.getDate() + (formData.days - 1));
      const newEnd = date.toISOString().split('T')[0];
      setFormData({ ...formData, startDate: val, endDate: newEnd });
    } else {
      setFormData({ ...formData, startDate: val });
    }
  };

  const handleDaysChange = (val: number) => {
    const days = Math.max(1, val);
    const date = new Date(formData.startDate || new Date());
    if (!isNaN(date.getTime())) {
      date.setDate(date.getDate() + (days - 1));
      const newEnd = date.toISOString().split('T')[0];
      setFormData({ ...formData, days, endDate: newEnd });
    } else {
      setFormData({ ...formData, days });
    }
  };

  const handleEndDateChange = (val: string) => {
    if (formData.startDate) {
      const start = new Date(formData.startDate);
      const end = new Date(val);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diff = end.getTime() - start.getTime();
        const days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
        setFormData({ ...formData, endDate: val, days });
      } else {
        setFormData({ ...formData, endDate: val });
      }
    } else {
      setFormData({ ...formData, endDate: val });
    }
  };

  const getReviewableRequests = () => {
    let filtered: LeaveRequest[] = [];
    if (isHRorAdmin) {
      filtered = leaveRequests.filter(r => r.userId !== user.id);
    } else if (isManager) {
      const directReportIds = employees.filter(u => u.managerId === user.id).map(u => u.id);
      filtered = leaveRequests.filter(r => directReportIds.includes(r.userId));
    }

    if (canFilterStatus && statusFilter !== 'ALL') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    return filtered;
  };

  const myLeaves = leaveRequests.filter(r => r.userId === user.id);
  const reviewableRequests = getReviewableRequests();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(formData);
    setShowForm(false);
    setFormData({ type: LeaveType.CASUAL, startDate: '', endDate: '', days: 1, reason: '', ccEmail: '' });
  };

  const handleProcessAction = (id: string, status: LeaveStatus) => {
    const statusLabel = status.toLowerCase();
    setProcessing(prev => ({ ...prev, [id]: statusLabel }));
    setTimeout(() => {
      onUpdateStatus(id, status, user.name);
      setProcessing(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 800);
  };

  const handleCancelRequest = (id: string) => {
    if (window.confirm("Are you sure you want to cancel this leave application?")) {
      handleProcessAction(id, LeaveStatus.CANCELLED);
    }
  };

  if (mode === 'approver') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Leave Approvals</h1>
            <p className="text-xs text-slate-500 mt-1">Reviewing requests from your team.</p>
          </div>
          {canFilterStatus && (
            <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm self-start">
              {(['ALL', LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.REJECTED] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                    statusFilter === f ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {reviewableRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewableRequests.map(req => {
              const requester = employees.find(u => u.id === req.userId);
              const isPending = req.status === LeaveStatus.PENDING;
              return (
                <div key={req.id} className={`relative bg-white p-5 rounded-3xl border shadow-sm hover:shadow-md transition-all ${!isPending ? 'border-slate-100 opacity-90' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center font-bold text-base">
                      {req.userName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{req.userName}</h4>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{requester?.department || 'Member'}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Leave Type</span>
                      <span className="font-bold text-slate-700 px-2 py-0.5 bg-slate-50 rounded-md text-[9px] uppercase tracking-wider">{req.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Duration</span>
                      <span className="font-bold text-slate-700">{req.startDate} — {req.endDate}</span>
                    </div>
                  </div>
                  {isPending ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleProcessAction(req.id, LeaveStatus.APPROVED)} disabled={!!processing[req.id]} className="flex-1 py-2.5 bg-emerald-600 text-white text-[10px] font-bold uppercase rounded-xl hover:bg-emerald-700 transition-all shadow-md">Approve</button>
                      <button onClick={() => handleProcessAction(req.id, LeaveStatus.REJECTED)} disabled={!!processing[req.id]} className="flex-1 py-2.5 bg-white border border-slate-200 text-rose-600 text-[10px] font-bold uppercase rounded-xl hover:bg-rose-50 transition-all">Reject</button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Status: {req.status}</p>
                      <p className="text-[9px] text-slate-400 italic">Processed on {req.processedDate}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No pending approvals</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Leave Hub</h1>
          <p className="text-slate-500 text-sm font-medium">Track your time off and available quotas.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] hover:bg-primary-700 shadow-md transition-all flex items-center gap-2">
          <i className="fas fa-plus"></i> Apply for Leave
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { type: LeaveType.EARNED, label: 'Earned Leave', color: 'primary', icon: 'fa-umbrella-beach' },
          { type: LeaveType.SICK, label: 'Sick Leave', color: 'rose', icon: 'fa-stethoscope' },
          { type: LeaveType.CASUAL, label: 'Casual Leave', color: 'amber', icon: 'fa-calendar-day' }
        ].map(item => {
          const bal = getBalanceForType(item.type);
          const remaining = Math.max(0, bal.total - bal.used);
          const percentage = bal.total > 0 ? (bal.used / bal.total) * 100 : 0;
          
          return (
            <div key={item.type} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-${item.color === 'primary' ? 'primary-50' : item.color + '-50'} text-${item.color === 'primary' ? 'primary-600' : item.color + '-600'} border border-${item.color === 'primary' ? 'primary-100' : item.color + '-100'}`}>
                    {item.label}
                  </span>
                  <i className={`fas ${item.icon} text-${item.color === 'primary' ? 'primary-100' : item.color + '-100'} text-xl`}></i>
                </div>
                
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{remaining}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Days Available</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">{bal.used} / {bal.total}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Used</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-${item.color === 'primary' ? 'primary-500' : item.color + '-500'} transition-all duration-1000 ease-out`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ModalPortal isOpen={showForm} onClose={() => setShowForm(false)}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <h3 className="font-bold text-base">Apply for Leave</h3>
            <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">LEAVE TYPE</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as LeaveType})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-bold text-sm text-slate-700 bg-slate-50"
              >
                <option value={LeaveType.CASUAL}>Casual Leave</option>
                <option value={LeaveType.SICK}>Sick Leave</option>
                <option value={LeaveType.EARNED}>Earned Leave</option>
                <option value={LeaveType.MATERNITY}>Maternity / Paternity</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">START DATE</label>
                <input 
                  type="date" 
                  required
                  value={formData.startDate}
                  onChange={e => handleStartDateChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 outline-none bg-slate-50 font-bold text-sm text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">DAYS</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={formData.days}
                  onChange={e => handleDaysChange(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white font-bold text-sm text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">REASON</label>
              <textarea 
                required
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none bg-white text-sm text-slate-700"
                placeholder="Reason for absence..."
              ></textarea>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">CC EMAIL (OPTIONAL)</label>
              <input 
                type="email"
                value={formData.ccEmail}
                onChange={e => setFormData({...formData, ccEmail: e.target.value})}
                placeholder="client-contact@example.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 text-sm text-slate-700"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="flex-1 py-2.5 text-slate-400 font-bold text-sm hover:text-slate-600 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-[2] py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-md hover:bg-primary-700 transition-all uppercase tracking-wider text-[10px]"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Application History</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{myLeaves.length} Records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Category & Reason</th>
                <th className="px-6 py-3">Applied</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3 text-center">Days</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...myLeaves].reverse().map(req => {
                const duration = computeDuration(req.startDate, req.endDate);
                const isPending = req.status === LeaveStatus.PENDING;
                return (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">{req.type}</span>
                        <span className="text-[11px] text-slate-500 italic truncate max-w-[200px]">"{req.reason}"</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-medium text-slate-400">{req.appliedDate}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-700">{req.startDate}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">to {req.endDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-900">
                        {duration}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {isPending && (
                          <button 
                            onClick={() => handleCancelRequest(req.id)}
                            disabled={!!processing[req.id]}
                            className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-700 transition-colors"
                          >
                            {processing[req.id] === 'cancelled' ? <i className="fas fa-spinner fa-spin mr-1"></i> : null}
                            Cancel
                          </button>
                        )}
                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border ${
                          req.status === LeaveStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          req.status === LeaveStatus.REJECTED ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          req.status === LeaveStatus.CANCELLED ? 'bg-slate-100 text-slate-400 border-slate-200' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {myLeaves.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">No previous applications detected</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;

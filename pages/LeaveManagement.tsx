
import React, { useState, useEffect } from 'react';
import { User, UserRole, LeaveRequest, LeaveStatus, LeaveType } from '../types';

interface LeaveManagementProps {
  user: User;
  employees: User[];
  leaveRequests: LeaveRequest[];
  onApply: (req: Partial<LeaveRequest>) => void;
  onUpdateStatus: (id: string, status: LeaveStatus, processedByName?: string) => void;
  mode?: 'requester' | 'approver';
}

const LeaveManagement: React.FC<LeaveManagementProps> = ({ 
  user, 
  employees,
  leaveRequests, 
  onApply, 
  onUpdateStatus, 
  mode = 'requester' 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [processing, setProcessing] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>(LeaveStatus.PENDING);
  const [formData, setFormData] = useState({
    type: LeaveType.CASUAL,
    startDate: '',
    endDate: '',
    days: 1,
    reason: ''
  });

  const isHRorAdmin = user.role === UserRole.ADMIN || user.role === UserRole.HR;
  const isManager = user.role === UserRole.MANAGER;
  const canFilterStatus = isHRorAdmin || isManager;

  // Function to calculate End Date based on Start Date and Days
  const calculateEndDate = (start: string, days: number) => {
    if (!start || days < 1) return '';
    const date = new Date(start);
    date.setDate(date.getDate() + (days - 1));
    return date.toISOString().split('T')[0];
  };

  // Function to calculate Days based on Start and End Date
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  const handleStartDateChange = (val: string) => {
    const newEndDate = calculateEndDate(val, formData.days);
    setFormData({ ...formData, startDate: val, endDate: newEndDate });
  };

  const handleDaysChange = (val: number) => {
    const newEndDate = calculateEndDate(formData.startDate, val);
    setFormData({ ...formData, days: val, endDate: newEndDate });
  };

  const handleEndDateChange = (val: string) => {
    const newDays = calculateDays(formData.startDate, val);
    setFormData({ ...formData, endDate: val, days: newDays });
  };

  const getReviewableRequests = () => {
    let filtered = [];
    if (isHRorAdmin) {
      // HR/Admin see everyone except themselves
      filtered = leaveRequests.filter(r => r.userId !== user.id);
    } else if (isManager) {
      // Managers see their direct reports
      const directReportIds = employees.filter(u => u.managerId === user.id).map(u => u.id);
      filtered = leaveRequests.filter(r => directReportIds.includes(r.userId));
    }

    // Apply status filter for anyone who has permission to see the filter
    if (canFilterStatus && statusFilter !== 'ALL') {
      filtered = filtered.filter(r => r.status === statusFilter);
    } else if (!canFilterStatus && isManager) {
       // Fallback for safety, though UI handles this
       filtered = filtered.filter(r => r.status === LeaveStatus.PENDING);
    }

    return filtered;
  };

  const myLeaves = leaveRequests.filter(r => r.userId === user.id);
  const reviewableRequests = getReviewableRequests();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(formData);
    setShowForm(false);
    setFormData({ type: LeaveType.CASUAL, startDate: '', endDate: '', days: 1, reason: '' });
  };

  const handleProcessAction = (id: string, status: LeaveStatus) => {
    const statusLabel = status === LeaveStatus.APPROVED ? 'approved' : 'rejected';
    setProcessing(prev => ({ ...prev, [id]: statusLabel }));
    setTimeout(() => {
      onUpdateStatus(id, status, user.name);
      setProcessing(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 1000);
  };

  if (mode === 'approver') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Leave Approvals</h1>
            <p className="text-sm text-slate-500 mt-1">
              {isHRorAdmin ? 'Organization-wide review and audit access.' : 'Reviewing direct reports and team history.'}
            </p>
          </div>
          {canFilterStatus && (
            <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm self-start">
              {(['ALL', LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.REJECTED] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    statusFilter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {reviewableRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviewableRequests.map(req => {
              const requester = employees.find(u => u.id === req.userId);
              const isPending = req.status === LeaveStatus.PENDING;
              return (
                <div key={req.id} className={`relative bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${!isPending ? 'border-slate-100 opacity-90' : 'border-slate-200'}`}>
                  {processing[req.id] && (
                    <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-[2px] animate-in fade-in duration-300 ${processing[req.id] === 'approved' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mb-3 shadow-lg scale-in-center animate-in zoom-in duration-300 ${processing[req.id] === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                        <i className={`fas ${processing[req.id] === 'approved' ? 'fa-check' : 'fa-times'}`}></i>
                      </div>
                      <p className={`font-black uppercase tracking-widest text-sm ${processing[req.id] === 'approved' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {processing[req.id] === 'approved' ? 'Approved' : 'Rejected'}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg">
                      {req.userName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{req.userName}</h4>
                      <p className="text-xs text-slate-500">Dept: {requester?.department || 'Unknown'}</p>
                    </div>
                    {!isPending && (
                      <div className="ml-auto">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${req.status === LeaveStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {req.status}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-medium">Type</span>
                      <span className="font-bold text-slate-700 px-2 py-0.5 bg-slate-50 rounded-md text-[10px] uppercase tracking-wider">{req.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-medium">Dates</span>
                      <span className="font-semibold text-slate-700">{req.startDate} — {req.endDate}</span>
                    </div>
                  </div>
                  {isPending ? (
                    <>
                      <p className="text-sm text-slate-600 italic bg-slate-50 p-4 rounded-xl mb-6 truncate hover:whitespace-normal transition-all">"{req.reason}"</p>
                      <div className="flex gap-3">
                        <button onClick={() => handleProcessAction(req.id, LeaveStatus.APPROVED)} disabled={!!processing[req.id]} className="flex-1 py-3 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50">Approve</button>
                        <button onClick={() => handleProcessAction(req.id, LeaveStatus.REJECTED)} disabled={!!processing[req.id]} className="flex-1 py-3 bg-white border border-slate-200 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-50 transition-all disabled:opacity-50">Reject</button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl"><p className="text-[11px] text-slate-500 italic leading-relaxed">Reason: {req.reason}</p></div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-24 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
             <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-200">
                <i className="fas fa-inbox text-2xl"></i>
             </div>
             <p className="text-slate-400 font-bold">No {statusFilter.toLowerCase()} requests found.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Leave Applications</h1>
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2">
          <i className="fas fa-plus"></i> New Application
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg">Apply for Leave</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Leave Type</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as LeaveType})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 bg-slate-50"
                >
                  <option value={LeaveType.CASUAL}>Casual Leave</option>
                  <option value={LeaveType.SICK}>Sick Leave</option>
                  <option value={LeaveType.EARNED}>Earned Leave</option>
                  <option value={LeaveType.MATERNITY}>Maternity/Paternity</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Start Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.startDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Days Required</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="1"
                      required
                      value={formData.days}
                      onChange={e => handleDaysChange(parseInt(e.target.value) || 1)}
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-bold"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Days</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">End Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.endDate}
                    onChange={e => handleEndDateChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Reason for Absence</label>
                <textarea 
                  required
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50 font-medium"
                  placeholder="Tell us a bit more about your request..."
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-slate-800">History</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Reason</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...myLeaves].reverse().map(req => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4"><span className="text-sm font-bold text-slate-700">{req.type}</span></td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-slate-700">{req.startDate}</div>
                    <div className="text-[10px] text-slate-400">to {req.endDate}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 italic max-w-xs truncate">"{req.reason}"</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      req.status === LeaveStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' :
                      req.status === LeaveStatus.REJECTED ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{req.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;

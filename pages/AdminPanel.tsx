
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, UserRole, LeaveType, LeaveBalance, Notification, Attendance, SystemConfig, Holiday, LeaveStatus, LeaveRequest } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';

interface AdminPanelProps {
  employees: User[];
  setEmployees: (action: any) => Promise<boolean>;
  leaveBalances: LeaveBalance[];
  attendances: Attendance[];
  onUpdateLeaveBalances: (userId: string, updates: Partial<Record<LeaveType, number>>) => Promise<void>;
  onBroadcast: (title: string, message: string, type: Notification['type']) => Promise<void>;
  systemConfig: SystemConfig;
  holidays: Holiday[];
  leaveRequests?: LeaveRequest[];
}

type FormSection = 'core' | 'personal' | 'job' | 'address' | 'finance' | 'leaves';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  employees, 
  setEmployees, 
  leaveBalances,
  attendances,
  onUpdateLeaveBalances,
  onBroadcast,
  systemConfig,
  holidays,
  leaveRequests = []
}) => {
  const [activeTab, setActiveTab] = useState<'workforce' | 'broadcast' | 'attendance'>('workforce');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [modalSection, setModalSection] = useState<FormSection>('core');
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const normalizeTimeForInput = (timeStr: string | undefined): string => {
    if (!timeStr) return '';
    return timeStr.split(':').slice(0, 2).join(':');
  };

  const formatSeconds = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

  const [broadcastData, setBroadcastData] = useState({
    title: '',
    message: '',
    type: 'info' as Notification['type']
  });

  const initialForm = {
    employeeId: '', name: '', email: '', password: '',
    role: UserRole.EMPLOYEE, department: '', managerId: '',
    shiftStart: '09:00', shiftEnd: '18:00',
    avatar: '',
    dob: '', gender: 'Male', maritalStatus: 'Single', nationality: 'Indian', bloodGroup: 'O+',
    personalEmail: '', contactNumber: '',
    emergencyContact: { name: '', relationship: '', phone: '' },
    jobTitle: '', employmentType: 'Permanent', probationEndDate: '', workLocation: 'Office', 
    employeeStatus: 'Active' as User['employeeStatus'],
    highestQualification: '', totalExperience: '', priorExperience: '',
    skills: '', languages: '', certifications: '',
    currentAddress: { street: '', city: '', state: '', country: 'India', zipCode: '' },
    permanentAddress: { street: '', city: '', state: '', country: 'India', zipCode: '' },
    bankDetails: { bankName: '', accountNumber: '', ifscCode: '', panNumber: '', socialSecurityNumber: '' },
    payrollCycle: 'Monthly',
    earnedLeave: 20, sickLeave: 10, casualLeave: 10
  };

  const [employeeFormData, setEmployeeFormData] = useState(initialForm);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmployeeFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setEmployeeFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof typeof prev] as any),
        [field]: value
      }
    }));
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastData.title || !broadcastData.message) return;
    setIsSubmitting(true);
    try {
      await onBroadcast(broadcastData.title, broadcastData.message, broadcastData.type);
      setBroadcastData({ title: '', message: '', type: 'info' });
      alert("Broadcast sent successfully to all employees!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddEmployeeModal = () => {
    setEditingEmployeeId(null);
    setModalSection('core');
    setEmployeeFormData({
      ...initialForm,
      employeeId: `NEX-${Math.floor(1000 + Math.random() * 9000)}`,
      avatar: `https://i.pravatar.cc/150?u=${Math.random()}`
    });
    setShowEmployeeModal(true);
  };

  const openEditEmployeeModal = (employee: User) => {
    setEditingEmployeeId(employee.id);
    setModalSection('core');
    const balances = leaveBalances.filter(b => b.userId === employee.id);
    setEmployeeFormData({
      ...initialForm,
      ...employee,
      shiftStart: normalizeTimeForInput(employee.shiftStart),
      shiftEnd: normalizeTimeForInput(employee.shiftEnd),
      password: '', 
      earnedLeave: balances.find(b => b.type === LeaveType.EARNED)?.total || 0,
      sickLeave: balances.find(b => b.type === LeaveType.SICK)?.total || 0,
      casualLeave: balances.find(b => b.type === LeaveType.CASUAL)?.total || 0,
      currentAddress: employee.currentAddress || initialForm.currentAddress,
      permanentAddress: employee.permanentAddress || initialForm.permanentAddress,
      bankDetails: {
        bankName: employee.bankDetails?.bankName || '',
        accountNumber: employee.bankDetails?.accountNumber || '',
        ifscCode: employee.bankDetails?.ifscCode || '',
        panNumber: employee.bankDetails?.panNumber || '',
        socialSecurityNumber: employee.bankDetails?.socialSecurityNumber || '',
      },
      emergencyContact: employee.emergencyContact || initialForm.emergencyContact,
      skills: Array.isArray(employee.skills) ? employee.skills.join(', ') : '',
      languages: Array.isArray(employee.languages) ? employee.languages.join(', ') : '',
      certifications: Array.isArray(employee.certifications) ? employee.certifications.join(', ') : ''
    } as any);
    setShowEmployeeModal(true);
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const processArrayField = (val: string) => 
        typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(s => s !== '') : val;

      const submissionData = {
        ...employeeFormData,
        skills: processArrayField(employeeFormData.skills),
        languages: processArrayField(employeeFormData.languages),
        certifications: processArrayField(employeeFormData.certifications)
      };

      let targetUserId = editingEmployeeId;
      if (editingEmployeeId) {
        const currentUserData = employees.find(e => e.id === editingEmployeeId);
        const finalPassword = employeeFormData.password.trim() !== '' ? employeeFormData.password : currentUserData?.password;
        const user = { ...currentUserData, ...submissionData, password: finalPassword } as User;
        await setEmployees((prev: User[]) => prev.map(e => e.id === editingEmployeeId ? user : e));
      } else {
        const id = Math.random().toString(36).substr(2, 9);
        targetUserId = id;
        const newUser = { id, joinDate: new Date().toISOString().split('T')[0], ...submissionData } as User;
        await setEmployees((prev: User[]) => [newUser, ...prev]);
      }

      if (targetUserId) {
        await onUpdateLeaveBalances(targetUserId, {
          [LeaveType.EARNED]: Number(employeeFormData.earnedLeave),
          [LeaveType.SICK]: Number(employeeFormData.sickLeave),
          [LeaveType.CASUAL]: Number(employeeFormData.casualLeave),
        });
      }
      setShowEmployeeModal(false);
    } catch (err) {
      console.error("❌ Failed to save employee:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return employees.filter(emp => 
      (emp.name.toLowerCase().includes(query) || emp.employeeId.toLowerCase().includes(query)) &&
      (filterDept === 'All' || emp.department === filterDept)
    );
  }, [employees, searchQuery, filterDept]);

  const globalAttendanceLogs = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return attendances
      .map(att => {
        const user = employees.find(e => String(e.id) === String(att.userId));
        let status = { label: 'PRESENT', class: 'bg-primary-100 text-primary-700' };
        if (att.lateReason) {
          status = { label: 'LATE', class: 'bg-rose-100 text-rose-700' };
        } else if (user) {
          try {
            const shiftStart = user.shiftStart || systemConfig.workStartTime;
            const [checkH, checkM] = att.checkIn.split(':').map(Number);
            const [shiftH, shiftM] = shiftStart.split(':').map(Number);
            const checkMinutes = checkH * 60 + checkM;
            const shiftMinutes = shiftH * 60 + shiftM;
            const grace = systemConfig.gracePeriodMinutes || 0;
            if (checkMinutes > shiftMinutes + grace) status = { label: 'LATE', class: 'bg-rose-100 text-rose-700' };
            else status = { label: 'ON TIME', class: 'bg-emerald-100 text-emerald-700' };
          } catch { /* fallback */ }
        }
        return { ...att, user, status };
      })
      .filter(item => {
        if (!item.user) return false;
        const matchesQuery = item.user.name.toLowerCase().includes(query) || item.user.employeeId.toLowerCase().includes(query);
        const matchesDept = filterDept === 'All' || item.user.department === filterDept;
        return matchesQuery && matchesDept;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendances, employees, searchQuery, filterDept, systemConfig]);

  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return ['All', ...Array.from(depts)].sort();
  }, [employees]);

  const renderModalSidebarItem = (id: FormSection, label: string, icon: string) => (
    <button
      type="button"
      onClick={() => setModalSection(id)}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-300 group ${
        modalSection === id 
          ? 'bg-primary-600 text-white shadow-xl shadow-primary-200' 
          : 'text-slate-500 hover:bg-white hover:text-primary-600 hover:shadow-sm'
      }`}
    >
      <i className={`fas ${icon} w-5 text-lg transition-transform group-hover:scale-110`}></i>
      <span className="hidden md:inline tracking-tight">{label}</span>
      {modalSection === id && <i className="fas fa-chevron-right ml-auto text-[10px] opacity-50"></i>}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
          <div className="flex gap-4 mt-4 bg-white p-1 rounded-xl border border-slate-200 w-fit">
            <button 
              onClick={() => setActiveTab('workforce')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'workforce' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Workforce
            </button>
            <button 
              onClick={() => setActiveTab('attendance')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'attendance' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Attendance Logs
            </button>
            <button 
              onClick={() => setActiveTab('broadcast')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'broadcast' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Broadcast Center
            </button>
          </div>
        </div>
        {activeTab === 'workforce' && (
          <button onClick={openAddEmployeeModal} className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-100">
            Register Member
          </button>
        )}
      </div>

      {(activeTab === 'workforce' || activeTab === 'attendance') && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input 
                type="text" placeholder={activeTab === 'workforce' ? "Search workforce..." : "Search logs by name/ID..."} 
                className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
            >
              {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            {activeTab === 'workforce' ? (
              <table className="w-full">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left">Member</th>
                    <th className="px-6 py-4 text-left">Department</th>
                    <th className="px-6 py-4 text-left">Remaining (E/S/C)</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map(user => {
                    const b = leaveBalances.filter(lb => lb.userId === user.id);
                    const getRem = (type: LeaveType) => {
                       const bal = b.find(x => x.type === type);
                       return bal ? Math.max(0, bal.total - (bal.used || 0)) : 0;
                    };
                    const onLeave = leaveRequests.some(lr => 
                      String(lr.userId) === String(user.id) && 
                      lr.status === LeaveStatus.APPROVED && 
                      todayStr >= lr.startDate && todayStr <= lr.endDate
                    );
                    return (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={resolveAvatarUrl(user.avatar)} className="w-10 h-10 rounded-full border border-slate-100 object-cover" alt="" />
                            <div><p className="font-bold text-slate-800">{user.name}</p><p className="text-[10px] font-mono font-bold text-primary-500 uppercase">{user.employeeId}</p></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{user.department || 'N/A'}</td>
                        <td className="px-6 py-4 text-xs font-bold">
                          <span className="text-primary-600" title="Earned Leave Remaining">{getRem(LeaveType.EARNED)}</span> / <span className="text-rose-600" title="Sick Leave Remaining">{getRem(LeaveType.SICK)}</span> / <span className="text-amber-600" title="Casual Leave Remaining">{getRem(LeaveType.CASUAL)}</span>
                        </td>
                        <td className="px-6 py-4">
                          {onLeave ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[10px] font-black uppercase">On Leave</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase">{user.role}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => navigate(`/attendance/${user.id}`)} className="text-primary-600 font-bold text-xs hover:underline">Attendance</button>
                            <Link to={`/profile/${user.id}`} className="text-slate-600 font-bold text-xs hover:underline">Profile</Link>
                            <button onClick={() => openEditEmployeeModal(user)} className="text-slate-600 font-bold text-xs hover:underline">Edit</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left">Employee</th>
                    <th className="px-6 py-4 text-left">Date</th>
                    <th className="px-6 py-4 text-left">Clock Times</th>
                    <th className="px-6 py-4 text-left">Total Duration</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {globalAttendanceLogs.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={resolveAvatarUrl(item.user?.avatar)} className="w-8 h-8 rounded-full object-cover" alt="" />
                          <div><p className="text-sm font-bold text-slate-800">{item.user?.name}</p><p className="text-[9px] text-slate-400">{item.user?.department}</p></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{item.date}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-600">{item.checkIn} - {item.checkOut || '--:--'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{formatSeconds(item.accumulatedTime || 0)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${item.status.class}`}>
                          {item.status.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="max-w-2xl bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-8">
            <h3 className="text-xl font-black text-slate-900">Broadcast Center</h3>
            <p className="text-sm text-slate-500">Instantly notify all employees via in-app alerts.</p>
          </div>
          <form onSubmit={handleBroadcastSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Notice Severity</label>
              <div className="flex gap-4">
                {(['info', 'success', 'warning', 'error'] as const).map(t => (
                  <label key={t} className="flex-1 cursor-pointer">
                    <input type="radio" name="broadcastType" value={t} checked={broadcastData.type === t} onChange={() => setBroadcastData({...broadcastData, type: t})} className="hidden peer" />
                    <div className={`py-4 text-center rounded-2xl border-2 transition-all peer-checked:bg-slate-900 peer-checked:text-white peer-checked:border-slate-900 ${t === 'info' ? 'border-primary-50 text-primary-600' : t === 'success' ? 'border-emerald-50 text-emerald-600' : t === 'warning' ? 'border-amber-50 text-amber-600' : 'border-rose-50 text-rose-600'}`}>
                      <i className={`fas ${t === 'info' ? 'fa-info-circle' : t === 'success' ? 'fa-check-circle' : t === 'warning' ? 'fa-exclamation-triangle' : 'fa-skull-crossbones'} block mb-2 text-xl`}></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">{t}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <FormInput label="Subject" value={broadcastData.title} onChange={(e: any) => setBroadcastData({...broadcastData, title: e.target.value})} placeholder="Message Subject..." />
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Content</label>
              <textarea required rows={4} value={broadcastData.message} onChange={e => setBroadcastData({...broadcastData, message: e.target.value})} placeholder="Write your broadcast message..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500/20 font-medium resize-none" />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              <i className="fas fa-paper-plane"></i> {isSubmitting ? 'Syncing...' : 'Dispatch to All'}
            </button>
          </form>
        </div>
      )}

      {showEmployeeModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-6xl overflow-hidden flex flex-col md:flex-row h-[85vh] shadow-[0_0_100px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300 border border-white">
            
            {/* Sidebar Navigation */}
            <div className="w-full md:w-72 bg-slate-50/80 border-r border-slate-100 p-8 flex flex-row md:flex-col gap-3 shrink-0 overflow-x-auto no-scrollbar">
              <div className="mb-8 hidden md:block">
                <div className="w-16 h-16 bg-primary-600 rounded-[1.5rem] flex items-center justify-center text-white text-2xl shadow-lg shadow-primary-200 mb-4">
                  <i className="fas fa-user-edit"></i>
                </div>
                <h4 className="text-xl font-black text-slate-800 tracking-tighter">Member Editor</h4>
                <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">Configuration Hub</p>
              </div>
              
              {renderModalSidebarItem('core', 'Account', 'fa-user-circle')}
              {renderModalSidebarItem('personal', 'Identity', 'fa-id-card')}
              {renderModalSidebarItem('job', 'Job Details', 'fa-briefcase')}
              {renderModalSidebarItem('address', 'Location', 'fa-map-marker-alt')}
              {renderModalSidebarItem('finance', 'Financial', 'fa-wallet')}
              {renderModalSidebarItem('leaves', 'Quotas', 'fa-calendar-check')}
              
              <div className="mt-auto pt-8 hidden md:block">
                <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                  <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1">Security Audit</p>
                  <p className="text-[10px] text-primary-400 leading-relaxed font-medium">Any changes made here are logged for compliance monitoring.</p>
                </div>
              </div>
            </div>

            {/* Main Form Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
              <div className="px-10 py-8 bg-white/50 backdrop-blur-sm border-b border-slate-50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-primary-600 rounded-full"></div>
                  <div>
                    <h3 className="font-black text-2xl text-slate-800 tracking-tight leading-none">
                      {editingEmployeeId ? 'Member Profile Configuration' : 'Corporate Identity Registration'}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 font-medium">Define core parameters for organization access.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEmployeeModal(false)} 
                  className="hover:bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all active:scale-90"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleEmployeeSubmit} className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-500">
                  {modalSection === 'core' && (
                    <div className="space-y-10">
                      <SectionHeader title="Basic Credentials" subtitle="Primary account and authentication details." icon="fa-lock" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        <FormInput label="Full Legal Name" name="name" value={employeeFormData.name} onChange={handleInputChange} required placeholder="Manoj Kumar" />
                        <FormInput label="Corporate ID" name="employeeId" value={employeeFormData.employeeId} onChange={handleInputChange} required placeholder="NEX-XXXX" />
                        <FormInput label="Work Email Address" name="email" value={employeeFormData.email} onChange={handleInputChange} required type="email" placeholder="name@company.com" />
                        <FormInput label="System Password" name="password" value={employeeFormData.password} onChange={handleInputChange} type="password" placeholder={editingEmployeeId ? "••••••••" : "Create initial password"} />
                        <FormSelect label="Access Role" name="role" value={employeeFormData.role} onChange={handleInputChange} options={Object.values(UserRole)} />
                        <FormInput label="Designated Department" name="department" value={employeeFormData.department} onChange={handleInputChange} placeholder="Engineering, Sales, etc." />
                      </div>
                    </div>
                  )}

                  {modalSection === 'personal' && (
                    <div className="space-y-12">
                      <div>
                        <SectionHeader title="Legal Identity" subtitle="Required personal information for legal compliance." icon="fa-id-badge" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8 mt-8">
                          <FormInput label="Date of Birth" name="dob" type="date" value={employeeFormData.dob} onChange={handleInputChange} />
                          <FormSelect label="Gender Identity" name="gender" value={employeeFormData.gender} onChange={handleInputChange} options={['Male', 'Female', 'Non-Binary', 'Other']} />
                          <FormSelect label="Marital Status" name="maritalStatus" value={employeeFormData.maritalStatus} onChange={handleInputChange} options={['Single', 'Married', 'Divorced', 'Widowed']} />
                          <FormInput label="Nationality" name="nationality" value={employeeFormData.nationality} onChange={handleInputChange} />
                          <FormSelect label="Blood Group" name="bloodGroup" value={employeeFormData.bloodGroup} onChange={handleInputChange} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
                          <FormInput label="Personal Email" type="email" name="personalEmail" value={employeeFormData.personalEmail} onChange={handleInputChange} />
                        </div>
                      </div>
                      
                      <div className="pt-10 border-t border-slate-50">
                        <SectionHeader title="Emergency Contact" subtitle="Primary person to contact in case of urgent incidents." icon="fa-phone-volume" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                          <FormInput label="Contact Name" value={employeeFormData.emergencyContact?.name} onChange={(e: any) => handleNestedInputChange('emergencyContact', 'name', e.target.value)} />
                          <FormInput label="Relationship" value={employeeFormData.emergencyContact?.relationship} onChange={(e: any) => handleNestedInputChange('emergencyContact', 'relationship', e.target.value)} />
                          <FormInput label="Contact Phone" value={employeeFormData.emergencyContact?.phone} onChange={(e: any) => handleNestedInputChange('emergencyContact', 'phone', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}

                  {modalSection === 'job' && (
                    <div className="space-y-10">
                      <SectionHeader title="Occupational Context" subtitle="Employment parameters and scheduling." icon="fa-briefcase" />
                      
                      <div className="grid grid-cols-1 gap-8">
                         <FormInput label="Organization / Company Name" value={systemConfig.companyName} readOnly={true} className="bg-slate-100 cursor-not-allowed opacity-80" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 mt-4">
                        <FormInput label="Official Job Title" name="jobTitle" value={employeeFormData.jobTitle} onChange={handleInputChange} />
                        
                        <FormSelect 
                          label="Reporting Manager" 
                          name="managerId" 
                          value={employeeFormData.managerId || ''} 
                          onChange={handleInputChange} 
                          options={['', ...employees.filter(e => e.id !== editingEmployeeId).map(e => e.id)]}
                          optionLabels={['None / Executive', ...employees.filter(e => e.id !== editingEmployeeId).map(e => e.name)]}
                        />

                        <FormSelect label="Contract Type" name="employmentType" value={employeeFormData.employmentType} onChange={handleInputChange} options={['Permanent', 'Contract', 'Intern']} />
                        <FormInput label="Probation End" name="probationEndDate" type="date" value={employeeFormData.probationEndDate} onChange={handleInputChange} />
                        <FormInput label="Primary Work Location" name="workLocation" value={employeeFormData.workLocation} onChange={handleInputChange} />
                        <FormSelect label="Internal Status" name="employeeStatus" value={employeeFormData.employeeStatus} onChange={handleInputChange} options={['Active', 'On Leave', 'Terminated']} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormInput label="Shift Starts" name="shiftStart" type="time" value={employeeFormData.shiftStart} onChange={handleInputChange} />
                          <FormInput label="Shift Ends" name="shiftEnd" type="time" value={employeeFormData.shiftEnd} onChange={handleInputChange} />
                        </div>
                      </div>
                    </div>
                  )}

                  {modalSection === 'address' && (
                    <div className="space-y-12">
                      <div>
                        <SectionHeader title="Current Residence" subtitle="Current physical mailing address." icon="fa-home" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 mt-8">
                          <div className="md:col-span-2">
                            <FormInput label="Street Address" value={employeeFormData.currentAddress?.street} onChange={(e: any) => handleNestedInputChange('currentAddress', 'street', e.target.value)} />
                          </div>
                          <FormInput label="City" value={employeeFormData.currentAddress?.city} onChange={(e: any) => handleNestedInputChange('currentAddress', 'city', e.target.value)} />
                          <FormInput label="State / Province" value={employeeFormData.currentAddress?.state} onChange={(e: any) => handleNestedInputChange('currentAddress', 'state', e.target.value)} />
                          <FormInput label="Postal Code" value={employeeFormData.currentAddress?.zipCode} onChange={(e: any) => handleNestedInputChange('currentAddress', 'zipCode', e.target.value)} />
                        </div>
                      </div>
                      <div className="pt-10 border-t border-slate-50">
                        <SectionHeader title="Permanent Residence" subtitle="Official address for legal and tax documentation." icon="fa-map-marked-alt" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 mt-8">
                          <div className="md:col-span-2">
                            <FormInput label="Street Address" value={employeeFormData.permanentAddress?.street} onChange={(e: any) => handleNestedInputChange('permanentAddress', 'street', e.target.value)} />
                          </div>
                          <FormInput label="City" value={employeeFormData.permanentAddress?.city} onChange={(e: any) => handleNestedInputChange('permanentAddress', 'city', e.target.value)} />
                          <FormInput label="State / Province" value={employeeFormData.permanentAddress?.state} onChange={(e: any) => handleNestedInputChange('permanentAddress', 'state', e.target.value)} />
                          <FormInput label="Postal Code" value={employeeFormData.permanentAddress?.zipCode} onChange={(e: any) => handleNestedInputChange('permanentAddress', 'zipCode', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}

                  {modalSection === 'finance' && (
                    <div className="space-y-10">
                      <SectionHeader title="Financial Disbursement" subtitle="Bank and tax identifiers for payroll processing." icon="fa-money-bill-transfer" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 mt-8">
                        <FormInput label="Financial Institution" value={employeeFormData.bankDetails?.bankName} onChange={(e: any) => handleNestedInputChange('bankDetails', 'bankName', e.target.value)} />
                        <FormInput label="Account Number" value={employeeFormData.bankDetails?.accountNumber} onChange={(e: any) => handleNestedInputChange('bankDetails', 'accountNumber', e.target.value)} />
                        <FormInput label="IFSC / Swift Code" value={employeeFormData.bankDetails?.ifscCode} onChange={(e: any) => handleNestedInputChange('bankDetails', 'ifscCode', e.target.value)} />
                        <FormInput label="National Tax ID (PAN)" value={employeeFormData.bankDetails?.panNumber} onChange={(e: any) => handleNestedInputChange('bankDetails', 'panNumber', e.target.value)} />
                        <FormInput label="Social Security ID" value={employeeFormData.bankDetails?.socialSecurityNumber} onChange={(e: any) => handleNestedInputChange('bankDetails', 'socialSecurityNumber', e.target.value)} />
                        <FormSelect label="Payroll Frequency" name="payrollCycle" value={employeeFormData.payrollCycle} onChange={handleInputChange} options={['Monthly', 'Bi-Weekly', 'Weekly']} />
                      </div>
                    </div>
                  )}

                  {modalSection === 'leaves' && (
                    <div className="space-y-10">
                      <SectionHeader title="Time-off Quotas" subtitle="Annual leave entitlement configurations." icon="fa-calendar-check" />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                        <FormInput label="Earned Leave (Days)" name="earnedLeave" type="number" value={employeeFormData.earnedLeave} onChange={handleInputChange} />
                        <FormInput label="Sick Leave (Days)" name="sickLeave" type="number" value={employeeFormData.sickLeave} onChange={handleInputChange} />
                        <FormInput label="Casual Leave (Days)" name="casualLeave" type="number" value={employeeFormData.casualLeave} onChange={handleInputChange} />
                      </div>
                    </div>
                  )}
                </div>
              </form>

              {/* Enhanced Footer */}
              <div className="px-12 py-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 text-slate-400">
                  <i className="fas fa-circle-info text-primary-500"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Autosaving drafts in background</span>
                </div>
                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setShowEmployeeModal(false)} 
                    className="px-8 py-4 text-slate-500 font-bold hover:bg-white hover:text-rose-500 rounded-2xl transition-all border border-transparent hover:border-slate-100"
                  >
                    Discard Changes
                  </button>
                  <button 
                    type="button" 
                    onClick={handleEmployeeSubmit} 
                    disabled={isSubmitting} 
                    className="px-12 py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-2xl shadow-primary-200 hover:bg-primary-700 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                  >
                    {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                    {isSubmitting ? 'Syncing...' : editingEmployeeId ? 'Sync Cloud Profile' : 'Complete Onboarding'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionHeader = ({ title, subtitle, icon }: { title: string, subtitle: string, icon: string }) => (
  <div className="flex items-start gap-4 mb-6">
    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 text-lg">
      <i className={`fas ${icon}`}></i>
    </div>
    <div>
      <h4 className="text-xl font-black text-slate-800 tracking-tight">{title}</h4>
      <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
    </div>
  </div>
);

const FormInput = ({ label, className = "", ...props }: any) => (
  <div className={`space-y-2 group ${className}`}>
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-primary-500 transition-colors">
      {label}
    </label>
    <div className="relative">
      <input 
        {...props} 
        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:bg-white font-bold text-slate-700 transition-all placeholder:text-slate-300 placeholder:font-medium disabled:opacity-50 disabled:cursor-not-allowed" 
      />
    </div>
  </div>
);

const FormSelect = ({ label, options, optionLabels, ...props }: any) => (
  <div className="space-y-2 group">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-primary-500 transition-colors">
      {label}
    </label>
    <div className="relative">
      <select 
        {...props} 
        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:bg-white font-black text-slate-700 transition-all appearance-none cursor-pointer"
      >
        {options.map((opt: string, i: number) => (
          <option key={opt} value={opt}>{optionLabels ? optionLabels[i] : opt}</option>
        ))}
      </select>
      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <i className="fas fa-chevron-down text-xs"></i>
      </div>
    </div>
  </div>
);

export default AdminPanel;

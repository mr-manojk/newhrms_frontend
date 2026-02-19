
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole, LeaveType, LeaveBalance, Notification, Attendance, SystemConfig, Holiday, LeaveRequest } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';
import ModalPortal from '../components/ModalPortal';

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

type FormSection = 'core' | 'personal' | 'job' | 'address' | 'finance' | 'skills' | 'leaves';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  employees, 
  setEmployees, 
  leaveBalances,
  attendances,
  onUpdateLeaveBalances,
  onBroadcast,
  systemConfig,
  holidays
}) => {
  const [activeTab, setActiveTab] = useState<'workforce' | 'broadcast' | 'attendance'>('workforce');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [modalSection, setModalSection] = useState<FormSection>('core');
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const normalizeTimeForInput = (timeStr: string | undefined): string => {
    if (!timeStr) return '';
    return timeStr.split(':').slice(0, 2).join(':');
  };

  const [broadcastData, setBroadcastData] = useState({
    title: '',
    message: '',
    type: 'info' as Notification['type']
  });

  const initialForm = {
    employeeId: '', name: '', email: '', password: '',
    role: UserRole.EMPLOYEE, department: '', managerId: '',
    shiftStart: '10:00', shiftEnd: '19:00',
    avatar: '',
    joinDate: '',
    dob: '', gender: 'Male', maritalStatus: 'Single', nationality: 'Indian', bloodGroup: 'O+',
    personalEmail: '', contactNumber: '',
    emergencyContact: { name: '', relationship: '', phone: '' },
    jobTitle: '', employmentType: 'Permanent', probationEndDate: '', workLocation: 'Office', 
    employeeStatus: 'Active' as User['employeeStatus'],
    highestQualification: '', totalExperience: '', priorExperience: '',
    skills: '', languages: '', certifications: '',
    currentAddress: { street: '', city: '', state: '', country: 'India', zipCode: '' },
    permanentAddress: { street: '', city: '', state: '', country: 'India', zipCode: '' },
    bankDetails: { bankName: '', accountNumber: '', ifscCode: '', panNumber: '', socialSecurityNumber: '', uanNumber: '', pfNumber: '' },
    payrollCycle: 'Monthly',
    earnedLeave: 21, sickLeave: 12, casualLeave: 10,
    notificationPreferences: { attendanceReminders: true, leaveUpdates: true, frequency: 'immediate', channels: { inApp: true, email: true } }
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
    const balances = leaveBalances.filter(b => String(b.userId) === String(employee.id));
    setEmployeeFormData({
      ...initialForm,
      ...employee,
      shiftStart: normalizeTimeForInput(employee.shiftStart),
      shiftEnd: normalizeTimeForInput(employee.shiftEnd),
      password: '', 
      earnedLeave: balances.find(b => b.type === LeaveType.EARNED)?.total || 21,
      sickLeave: balances.find(b => b.type === LeaveType.SICK)?.total || 12,
      casualLeave: balances.find(b => b.type === LeaveType.CASUAL)?.total || 10,
      currentAddress: employee.currentAddress || initialForm.currentAddress,
      permanentAddress: employee.permanentAddress || initialForm.permanentAddress,
      bankDetails: {
        ...initialForm.bankDetails,
        ...employee.bankDetails
      },
      emergencyContact: employee.emergencyContact || initialForm.emergencyContact,
      skills: Array.isArray(employee.skills) ? employee.skills.join(', ') : '',
      languages: Array.isArray(employee.languages) ? employee.languages.join(', ') : '',
      certifications: Array.isArray(employee.certifications) ? employee.certifications.join(', ') : '',
      notificationPreferences: employee.notificationPreferences || initialForm.notificationPreferences
    } as any);
    setShowEmployeeModal(true);
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const processArrayField = (val: any) => 
        typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(s => s !== '') : (val || []);

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
        const numericIds = employees.map(emp => parseInt(emp.id)).filter(id => !isNaN(id));
        const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
        const id = String(nextId);
        targetUserId = id;
        const newUser = { id, ...submissionData } as User;
        if (!newUser.joinDate) newUser.joinDate = new Date().toISOString().split('T')[0];
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
      console.error("Failed to save employee:", err);
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
        modalSection === id 
          ? 'bg-primary-600 text-white shadow-md' 
          : 'text-slate-500 hover:bg-white hover:text-primary-600'
      }`}
    >
      <i className={`fas ${icon} w-4 text-sm`}></i>
      <span className="hidden md:inline tracking-tight">{label}</span>
    </button>
  );

  const getQuotaForType = (userId: string, type: LeaveType) => {
    return leaveBalances.find(b => String(b.userId) === String(userId) && b.type === type)?.total || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Workforce Manager</h1>
          <div className="flex gap-2 mt-4 bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-sm">
            {(['workforce', 'attendance', 'broadcast'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-widest ${activeTab === tab ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        {activeTab === 'workforce' && (
          <button onClick={openAddEmployeeModal} className="bg-primary-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 flex items-center gap-2">
            <i className="fas fa-plus"></i>
            Add Employee
          </button>
        )}
      </div>

      {(activeTab === 'workforce' || activeTab === 'attendance') && (
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50/50">
            <div className="flex-1 relative group">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors"></i>
              <input 
                type="text" placeholder="Search people, ID, or department..." 
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 text-sm font-medium transition-all"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="px-6 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-600 appearance-none cursor-pointer hover:bg-slate-50 transition-colors min-w-[150px]"
            >
              {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            {activeTab === 'workforce' ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-4">Member</th>
                    <th className="px-8 py-4">Reporting To</th>
                    <th className="px-8 py-4">Department</th>
                    <th className="px-8 py-4">Quotas</th>
                    <th className="px-8 py-4">Role</th>
                    <th className="px-8 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredEmployees.map(user => {
                    const manager = employees.find(e => String(e.id) === String(user.managerId));
                    return (
                      <tr key={user.id} className="hover:bg-primary-50/30 transition-colors group">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            <img src={resolveAvatarUrl(user.avatar)} className="w-10 h-10 rounded-xl object-cover border-2 border-slate-50 shadow-sm" alt="" />
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter mt-0.5">{user.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          {manager ? (
                            <div className="flex items-center gap-2">
                              <img src={resolveAvatarUrl(manager.avatar)} className="w-6 h-6 rounded-lg object-cover" alt="" />
                              <span className="font-bold text-slate-600 text-[10px]">{manager.name}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">Independent</span>
                          )}
                        </td>
                        <td className="px-8 py-4 text-slate-500 font-bold text-[11px] uppercase tracking-tight">{user.department || 'General'}</td>
                        <td className="px-8 py-4">
                          <div className="flex gap-2">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded font-black text-[9px] border border-emerald-100" title="Earned Leaves">{getQuotaForType(user.id, LeaveType.EARNED)}E</span>
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded font-black text-[9px] border border-rose-100" title="Sick Leaves">{getQuotaForType(user.id, LeaveType.SICK)}S</span>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded font-black text-[9px] border border-amber-100" title="Casual Leaves">{getQuotaForType(user.id, LeaveType.CASUAL)}C</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">{user.role}</span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => navigate(`/attendance/${user.id}`)} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">Attendance</button>
                            <button onClick={() => navigate(`/profile/${user.id}`)} className="text-primary-600 font-black text-[10px] uppercase tracking-widest hover:underline">Log</button>
                            <button onClick={() => openEditEmployeeModal(user)} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-800">Edit</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No employees matching your search</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-4">Employee</th>
                    <th className="px-8 py-4">Date</th>
                    <th className="px-8 py-4">Clock Times</th>
                    <th className="px-8 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {globalAttendanceLogs.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4 flex items-center gap-3">
                        <img src={resolveAvatarUrl(item.user?.avatar)} className="w-8 h-8 rounded-lg object-cover" />
                        <span className="font-bold text-slate-700 text-xs">{item.user?.name}</span>
                      </td>
                      <td className="px-8 py-4 text-slate-400 font-medium text-xs">{item.date}</td>
                      <td className="px-8 py-4 font-mono text-slate-500 text-[11px] font-bold">{item.checkIn} - {item.checkOut || '--'}</td>
                      <td className="px-8 py-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${item.status.class}`}>
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
        <div className="max-w-xl bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm mx-auto mt-10">
          <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-[1.25rem] flex items-center justify-center text-2xl mb-6">
            <i className="fas fa-bullhorn"></i>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Organization Broadcast</h3>
          <p className="text-sm text-slate-500 mb-8">Send an instantaneous notification to all employee dashboards.</p>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!broadcastData.title || !broadcastData.message) return;
            setIsSubmitting(true);
            try {
              await onBroadcast(broadcastData.title, broadcastData.message, broadcastData.type);
              setBroadcastData({ title: '', message: '', type: 'info' });
              alert("Broadcast dispatched to all active nodes.");
            } finally {
              setIsSubmitting(false);
            }
          }} className="space-y-6">
            <div className="flex gap-2">
              {(['info', 'success', 'warning', 'error'] as const).map(t => (
                <label key={t} className="flex-1 cursor-pointer">
                  <input type="radio" name="broadcastType" value={t} checked={broadcastData.type === t} onChange={() => setBroadcastData({...broadcastData, type: t})} className="hidden peer" />
                  <div className={`py-3 text-center rounded-xl border transition-all peer-checked:bg-slate-900 peer-checked:text-white peer-checked:border-slate-900 ${t === 'info' ? 'text-primary-500 border-primary-100 bg-primary-50/30' : 'text-amber-500 border-amber-100 bg-amber-50/30'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest">{t}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
              <input required placeholder="Announcement headline..." value={broadcastData.title} onChange={e => setBroadcastData({...broadcastData, title: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Content</label>
              <textarea required rows={4} value={broadcastData.message} onChange={e => setBroadcastData({...broadcastData, message: e.target.value})} placeholder="Detailed explanation..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm resize-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all" />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-primary-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-3">
              {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
              {isSubmitting ? 'Syncing Notification Nodes...' : 'Broadcast to Workforce'}
            </button>
          </form>
        </div>
      )}

      {/* Employee Editor Modal */}
      <ModalPortal isOpen={showEmployeeModal} onClose={() => setShowEmployeeModal(false)}>
        <div className="bg-white rounded-[2.5rem] w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[85vh] shadow-2xl animate-in zoom-in duration-300 border border-slate-200">
          <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 p-8 flex flex-row md:flex-col gap-2 shrink-0 overflow-x-auto no-scrollbar">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 hidden md:block">Profile Config</h4>
            {renderModalSidebarItem('core', 'Account Access', 'fa-user-circle')}
            {renderModalSidebarItem('personal', 'Personal Data', 'fa-id-card')}
            {renderModalSidebarItem('job', 'Job & Career', 'fa-briefcase')}
            {renderModalSidebarItem('address', 'Location Details', 'fa-map-marker-alt')}
            {renderModalSidebarItem('finance', 'Financial Nodes', 'fa-wallet')}
            {renderModalSidebarItem('skills', 'Skills & Education', 'fa-graduation-cap')}
            {renderModalSidebarItem('leaves', 'Leave Quotas', 'fa-calendar-check')}
          </div>

          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <div className="px-10 py-6 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-black text-xl text-slate-900 tracking-tight">{editingEmployeeId ? 'Update Member Profile' : 'Register New Employee'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuring {employeeFormData.name || 'Untitled Identity'}</p>
              </div>
              <button onClick={() => setShowEmployeeModal(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all"><i className="fas fa-times text-lg"></i></button>
            </div>

            <form onSubmit={handleEmployeeSubmit} className="flex-1 overflow-y-auto p-10 no-scrollbar">
              <div className="max-w-3xl mx-auto space-y-12 animate-in slide-in-from-right-2">
                
                {modalSection === 'core' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormInput label="Full Display Name" name="name" value={employeeFormData.name} onChange={handleInputChange} required placeholder="e.g. Johnathan Doe" />
                    <FormInput label="Employee Corporate ID" name="employeeId" value={employeeFormData.employeeId} onChange={handleInputChange} required />
                    <FormInput label="Corporate Email" name="email" value={employeeFormData.email} onChange={handleInputChange} required type="email" />
                    <FormInput label="Master Password" name="password" value={employeeFormData.password} onChange={handleInputChange} type="password" placeholder={editingEmployeeId ? "Leave blank to preserve encrypted key" : "Default secure password"} />
                    <FormSelect label="Access Level" name="role" value={employeeFormData.role} onChange={handleInputChange} options={Object.values(UserRole)} />
                    <FormInput label="Primary Department" name="department" value={employeeFormData.department} onChange={handleInputChange} placeholder="e.g. Engineering" />
                  </div>
                )}

                {modalSection === 'personal' && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <FormInput label="Birth Date" name="dob" type="date" value={employeeFormData.dob} onChange={handleInputChange} />
                      <FormSelect label="Gender" name="gender" value={employeeFormData.gender} onChange={handleInputChange} options={['Male', 'Female', 'Non-Binary', 'Other']} />
                      <FormSelect label="Marital Status" name="maritalStatus" value={employeeFormData.maritalStatus} onChange={handleInputChange} options={['Single', 'Married', 'Divorced', 'Widowed']} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <FormInput label="Nationality" name="nationality" value={employeeFormData.nationality} onChange={handleInputChange} />
                      <FormSelect label="Blood Group" name="bloodGroup" value={employeeFormData.bloodGroup} onChange={handleInputChange} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
                      <FormInput label="Personal Mobile" name="contactNumber" value={employeeFormData.contactNumber} onChange={handleInputChange} type="tel" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormInput label="Personal Email (Backup)" name="personalEmail" value={employeeFormData.personalEmail} onChange={handleInputChange} type="email" />
                    </div>
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-6">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emergency Contact Node</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormInput label="Contact Name" value={employeeFormData.emergencyContact.name} onChange={(e: any) => handleNestedInputChange('emergencyContact', 'name', e.target.value)} />
                        <FormInput label="Relationship" value={employeeFormData.emergencyContact.relationship} onChange={(e: any) => handleNestedInputChange('emergencyContact', 'relationship', e.target.value)} />
                        <FormInput label="Emergency Phone" value={employeeFormData.emergencyContact.phone} onChange={(e: any) => handleNestedInputChange('emergencyContact', 'phone', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {modalSection === 'job' && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormInput label="Official Job Title" name="jobTitle" value={employeeFormData.jobTitle} onChange={handleInputChange} placeholder="e.g. Senior Backend Architect" />
                      <FormSelect label="Employment Status" name="employeeStatus" value={employeeFormData.employeeStatus} onChange={handleInputChange} options={['Active', 'On Leave', 'Terminated']} />
                      <FormSelect label="Agreement Type" name="employmentType" value={employeeFormData.employmentType} onChange={handleInputChange} options={['Permanent', 'Contract', 'Intern', 'Probation']} />
                      <FormInput label="Probation End Date" name="probationEndDate" type="date" value={employeeFormData.probationEndDate} onChange={handleInputChange} />
                      <FormInput label="Base Work Location" name="workLocation" value={employeeFormData.workLocation} onChange={handleInputChange} placeholder="e.g. Remote / Bangalore Office" />
                      <FormInput label="Date of Joining" name="joinDate" type="date" value={employeeFormData.joinDate} onChange={handleInputChange} />
                    </div>
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-6">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Org Hierarchy & Shifts</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reporting Manager</label>
                          <select name="managerId" value={employeeFormData.managerId} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary-500/10 font-bold text-sm text-slate-700 transition-all appearance-none cursor-pointer">
                            <option value="">No Manager (Independent)</option>
                            {employees.filter(e => e.id !== editingEmployeeId).map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}
                          </select>
                        </div>
                        <FormInput label="Shift Starts" name="shiftStart" type="time" value={employeeFormData.shiftStart} onChange={handleInputChange} />
                        <FormInput label="Shift Ends" name="shiftEnd" type="time" value={employeeFormData.shiftEnd} onChange={handleInputChange} />
                      </div>
                    </div>
                  </div>
                )}

                {modalSection === 'address' && (
                  <div className="space-y-12">
                    <AddressForm 
                      label="Current Residence" 
                      data={employeeFormData.currentAddress} 
                      onChange={(f, v) => handleNestedInputChange('currentAddress', f, v)} 
                    />
                    <div className="h-px bg-slate-100 w-full"></div>
                    <AddressForm 
                      label="Permanent Address" 
                      data={employeeFormData.permanentAddress} 
                      onChange={(f, v) => handleNestedInputChange('permanentAddress', f, v)} 
                    />
                  </div>
                )}

                {modalSection === 'finance' && (
                  <div className="space-y-10">
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex gap-4">
                      <i className="fas fa-shield-alt text-amber-500 mt-1"></i>
                      <p className="text-xs font-bold text-amber-800 leading-relaxed">Financial nodes are encrypted and used exclusively for automated payroll processing. Verified bank data is required for disbursements.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormInput label="Bank Name" value={employeeFormData.bankDetails.bankName} onChange={(e: any) => handleNestedInputChange('bankDetails', 'bankName', e.target.value)} />
                      <FormInput label="A/C Number" value={employeeFormData.bankDetails.accountNumber} onChange={(e: any) => handleNestedInputChange('bankDetails', 'accountNumber', e.target.value)} />
                      <FormInput label="IFSC / SWIFT Code" value={employeeFormData.bankDetails.ifscCode} onChange={(e: any) => handleNestedInputChange('bankDetails', 'ifscCode', e.target.value)} />
                      <FormInput label="PAN / TAX ID" value={employeeFormData.bankDetails.panNumber} onChange={(e: any) => handleNestedInputChange('bankDetails', 'panNumber', e.target.value)} />
                      <FormInput label="UAN Number" value={employeeFormData.bankDetails.uanNumber} onChange={(e: any) => handleNestedInputChange('bankDetails', 'uanNumber', e.target.value)} />
                      <FormInput label="PF / ESI Number" value={employeeFormData.bankDetails.pfNumber} onChange={(e: any) => handleNestedInputChange('bankDetails', 'pfNumber', e.target.value)} />
                      <FormSelect label="Payroll Cycle" name="payrollCycle" value={employeeFormData.payrollCycle} onChange={handleInputChange} options={['Monthly', 'Fortnightly', 'Weekly']} />
                    </div>
                  </div>
                )}

                {modalSection === 'skills' && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormInput label="Highest Qualification" name="highestQualification" value={employeeFormData.highestQualification} onChange={handleInputChange} placeholder="e.g. Master of Science in IT" />
                      <FormInput label="Total Experience" name="totalExperience" value={employeeFormData.totalExperience} onChange={handleInputChange} placeholder="e.g. 5 Years" />
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Prior Experience Summary</label>
                        <textarea name="priorExperience" value={employeeFormData.priorExperience} onChange={handleInputChange} placeholder="Previous companies, roles and key achievements..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary-500/10 text-sm font-bold text-slate-700 min-h-[120px] resize-none" />
                      </div>
                      <div className="md:col-span-2 space-y-6">
                        <FormInput label="Skills (Comma Separated)" name="skills" value={employeeFormData.skills} onChange={handleInputChange} placeholder="e.g. React, Python, Cloud Computing" />
                        <FormInput label="Languages Known" name="languages" value={employeeFormData.languages} onChange={handleInputChange} placeholder="e.g. English, Hindi, German" />
                        <FormInput label="Professional Certifications" name="certifications" value={employeeFormData.certifications} onChange={handleInputChange} placeholder="e.g. AWS Solutions Architect, PMP" />
                      </div>
                    </div>
                  </div>
                )}

                {modalSection === 'leaves' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100 text-center">
                      <FormInput label="Earned Leave Quota" name="earnedLeave" type="number" value={employeeFormData.earnedLeave} onChange={handleInputChange} />
                      <p className="text-[10px] text-emerald-600 font-bold uppercase mt-4">Annual Carryover Capable</p>
                    </div>
                    <div className="bg-rose-50/50 p-8 rounded-3xl border border-rose-100 text-center">
                      <FormInput label="Sick Leave Quota" name="sickLeave" type="number" value={employeeFormData.sickLeave} onChange={handleInputChange} />
                      <p className="text-[10px] text-rose-600 font-bold uppercase mt-4">Medical Grounds Only</p>
                    </div>
                    <div className="bg-amber-50/50 p-8 rounded-3xl border border-amber-100 text-center">
                      <FormInput label="Casual Leave Quota" name="casualLeave" type="number" value={employeeFormData.casualLeave} onChange={handleInputChange} />
                      <p className="text-[10px] text-amber-600 font-bold uppercase mt-4">Short-term Absence</p>
                    </div>
                  </div>
                )}

              </div>
            </form>

            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 sticky bottom-0 z-10">
                <button type="button" onClick={() => setShowEmployeeModal(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-all">Discard Changes</button>
                <button type="button" onClick={handleEmployeeSubmit} disabled={isSubmitting} className="px-10 py-3 bg-primary-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-3 disabled:opacity-50">
                  {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-cloud-upload"></i>}
                  {editingEmployeeId ? 'Synchronize Record' : 'Create Identity Node'}
                </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};

const FormInput = ({ label, className = "", ...props }: any) => (
  <div className={`space-y-1.5 ${className}`}>
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input {...props} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 text-sm font-bold text-slate-700 transition-all placeholder:text-slate-300" />
  </div>
);

const FormSelect = ({ label, options, ...props }: any) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <select {...props} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 text-sm font-black text-slate-700 transition-all appearance-none cursor-pointer">
      {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const AddressForm = ({ label, data, onChange }: any) => (
  <div className="space-y-6">
    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</h5>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <FormInput label="Street Address" value={data.street} onChange={(e: any) => onChange('street', e.target.value)} />
      </div>
      <FormInput label="City" value={data.city} onChange={(e: any) => onChange('city', e.target.value)} />
      <FormInput label="State / Province" value={data.state} onChange={(e: any) => onChange('state', e.target.value)} />
      <FormInput label="Country" value={data.country} onChange={(e: any) => onChange('country', e.target.value)} />
      <FormInput label="Zip / Postal Code" value={data.zipCode} onChange={(e: any) => onChange('zipCode', e.target.value)} />
    </div>
  </div>
);

export default AdminPanel;


import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, NotificationPreference, UserDocument, Address, EmergencyContact, BankDetails, UserRole } from '../types';
import { userService } from '../services/userService';
import { resolveAvatarUrl, ASSET_BASE_URL } from '../services/apiClient';

interface ProfilePageProps {
  loggedInUser: User;
  employees: User[];
  onUpdateUser: (updatedUser: User) => Promise<void> | void;
}

type ProfileSection = 'personal' | 'address' | 'job' | 'finance' | 'documents' | 'skills' | 'security' | 'notifications';

const ProfilePage: React.FC<ProfilePageProps> = ({ loggedInUser, employees, onUpdateUser }) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileSection>('personal');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [managerName, setManagerName] = useState<string>('N/A');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Helper to ensure time strings are compatible with <input type="time"> (HH:mm format)
  const normalizeTimeForInput = (timeStr: string | undefined): string => {
    if (!timeStr) return '';
    return timeStr.split(':').slice(0, 2).join(':');
  };

  // Determine which user's profile we are looking at
  const user = id ? (employees.find(e => String(e.id) === String(id)) || loggedInUser) : loggedInUser;
  const isViewingSelf = String(user.id) === String(loggedInUser.id);

  // Local state for editable user fields
  const [localUser, setLocalUser] = useState<User>(user);
  
  // Dedicated string state for list-based inputs to allow smooth comma-separated typing
  const [skillsInput, setSkillsInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('');

  // Helper to determine if current user has management permissions
  const isHRorAdmin = loggedInUser.role === UserRole.HR || loggedInUser.role === UserRole.ADMIN;

  useEffect(() => {
    setLocalUser(user);
    setSkillsInput((user.skills || []).join(', '));
    setLanguagesInput((user.languages || []).join(', '));
    
    if (user.managerId && employees.length > 0) {
      const manager = employees.find(u => String(u.id) === String(user.managerId));
      setManagerName(manager ? manager.name : 'N/A');
    }
  }, [user, employees]);

  const handleInputChange = (field: keyof User, value: any) => {
    setLocalUser(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent: keyof User, field: string, value: any) => {
    setLocalUser(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value
      }
    }));
  };

  const handleSaveChanges = async () => {
    setIsUpdating(true);
    setError(null);
    
    // Parse the string inputs into arrays before saving
    const processArrayField = (val: string) => 
      val.split(',').map(s => s.trim()).filter(s => s !== '');

    const finalUser = {
      ...localUser,
      skills: processArrayField(skillsInput),
      languages: processArrayField(languagesInput)
    };

    try {
      await onUpdateUser(finalUser);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarClick = () => {
    if (!isHRorAdmin && !isViewingSelf) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setError(null);
      try {
        const serverPath = await userService.uploadAvatar(file, user.name);
        const updatedUser = { ...localUser, avatar: serverPath };
        setLocalUser(updatedUser);
        await onUpdateUser(updatedUser);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError("Avatar upload failed.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDocumentClick = () => {
    documentInputRef.current?.click();
  };

  const handleDocumentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const docType = window.prompt("Enter Document Type (e.g., Salary Slip, ID Proof, Contract):");
      if (!docType) {
        e.target.value = '';
        return;
      }

      setIsUploading(true);
      setError(null);
      try {
        // Use user.name or a specific ID to build the folder name 'manoj'
        const targetUsername = user.name;
        const serverUrl = await userService.uploadDocument(file, targetUsername, docType);
        
        const newDoc: UserDocument = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: docType,
          url: serverUrl,
          uploadDate: new Date().toLocaleDateString()
        };

        const updatedUser = { 
          ...localUser, 
          documents: [...(localUser.documents || []), newDoc] 
        };
        
        setLocalUser(updatedUser);
        await onUpdateUser(updatedUser);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError("Document upload failed.");
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const handleDownloadDocument = (doc: UserDocument) => {
    // Add API key if needed by server configuration
    const url = doc.url.startsWith('http') ? doc.url : `${ASSET_BASE_URL}${doc.url}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const dbUser = employees.find(u => String(u.id) === String(user.id)) || user;
    
    if (passwordData.current !== dbUser.password) {
      setError("Current password is incorrect.");
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (passwordData.new.length < 6) {
      setError("Minimum 6 characters required.");
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateUser({ ...dbUser, password: passwordData.new });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setShowPasswordModal(false);
        setPasswordData({ current: '', new: '', confirm: '' });
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderTabButton = (id: ProfileSection, label: string, icon: string) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
        activeTab === id 
          ? 'border-primary-600 text-primary-600 bg-primary-50/30' 
          : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
      }`}
    >
      <i className={`fas ${icon} w-4`}></i>
      {label}
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header Profile Card */}
      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="h-40 bg-gradient-to-r from-primary-900 via-slate-900 to-primary-800 relative">
          <div className="absolute -bottom-16 left-10 group">
            <div className="relative">
              <img 
                src={resolveAvatarUrl(localUser.avatar)} 
                alt={localUser.name} 
                className={`w-32 h-32 rounded-[2rem] border-4 border-white shadow-2xl object-cover bg-white transition-opacity ${isUploading ? 'opacity-50' : 'opacity-100'}`} 
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fas fa-circle-notch fa-spin text-primary-600 text-2xl"></i>
                </div>
              )}
              <button 
                onClick={handleAvatarClick}
                disabled={isUploading}
                className={`absolute inset-0 bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity ${(!isHRorAdmin && !isViewingSelf) ? 'hidden' : ''}`}
              >
                <i className="fas fa-camera text-xl"></i>
              </button>
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarFileChange} />
            </div>
          </div>
        </div>
        <div className="pt-20 pb-8 px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900">{localUser.name}</h1>
              <p className="text-slate-500 font-medium mt-1">
                {localUser.jobTitle || 'Team Member'} <span className="mx-2 text-slate-300">•</span> {localUser.department}
              </p>
            </div>
            <div className="flex gap-3">
              {isViewingSelf && (
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 text-sm"
                >
                  <i className="fas fa-key text-xs"></i>
                  Credentials
                </button>
              )}
              {(isHRorAdmin || isViewingSelf) && (
                <button 
                  onClick={handleSaveChanges}
                  disabled={isUpdating || isUploading}
                  className="px-8 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {isUpdating ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>}
                  {isUpdating ? 'Synchronizing...' : 'Save All Changes'}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex overflow-x-auto no-scrollbar border-t border-slate-100 px-4">
          {renderTabButton('personal', 'Personal', 'fa-user')}
          {renderTabButton('address', 'Addresses', 'fa-map-marker-alt')}
          {renderTabButton('job', 'Job & Org', 'fa-briefcase')}
          {renderTabButton('finance', 'Financial', 'fa-wallet')}
          {renderTabButton('documents', 'Documents', 'fa-file-invoice')}
          {renderTabButton('skills', 'Skills & Edu', 'fa-graduation-cap')}
          {renderTabButton('notifications', 'Settings', 'fa-bell')}
        </div>
      </div>

      {(success || isUpdating) && !showPasswordModal && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <i className={`fas ${isUpdating ? 'fa-sync fa-spin' : 'fa-check-circle'} text-lg`}></i>
          <p className="text-sm font-bold">
            {isUpdating ? 'Synchronizing with cloud...' : 'Profile successfully synchronized with the cloud.'}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <i className="fas fa-exclamation-triangle text-lg"></i>
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[400px]">
          
          {/* PERSONAL INFO */}
          {activeTab === 'personal' && (
            <div className="space-y-8">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Personal Details</h3>
                <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-1 rounded font-black uppercase">Basic Identity</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <EditableField label="Full Name" value={localUser.name} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('name', v)} />
                <EditableField label="Date of Birth" type="date" value={localUser.dob || ''} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('dob', v)} />
                <EditableField label="Gender" type="select" options={['Male', 'Female', 'Non-Binary', 'Other']} value={localUser.gender || ''} onChange={(v: string) => handleInputChange('gender', v)} />
                <EditableField label="Marital Status" type="select" options={['Single', 'Married', 'Divorced', 'Widowed']} value={localUser.maritalStatus || ''} onChange={(v: string) => handleInputChange('maritalStatus', v)} />
                <EditableField label="Nationality" value={localUser.nationality || ''} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('nationality', v)} />
                <EditableField label="Blood Group" type="select" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} value={localUser.bloodGroup || ''} onChange={(v: string) => handleInputChange('bloodGroup', v)} />
                <EditableField label="Personal Email" type="email" value={localUser.personalEmail || ''} onChange={(v: string) => handleInputChange('personalEmail', v)} />
                <EditableField label="Mobile Number" type="tel" value={localUser.contactNumber || ''} onChange={(v: string) => handleInputChange('contactNumber', v)} />
              </div>
              
              <div className="pt-8 border-t border-slate-50">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <EditableField label="Contact Name" value={localUser.emergencyContact?.name || ''} onChange={(v: string) => handleNestedChange('emergencyContact', 'name', v)} />
                  <EditableField label="Relationship" value={localUser.emergencyContact?.relationship || ''} onChange={(v: string) => handleNestedChange('emergencyContact', 'relationship', v)} />
                  <EditableField label="Phone" value={localUser.emergencyContact?.phone || ''} onChange={(v: string) => handleNestedChange('emergencyContact', 'phone', v)} />
                </div>
              </div>
            </div>
          )}

          {/* ADDRESS INFO */}
          {activeTab === 'address' && (
            <div className="space-y-12">
              <AddressSection 
                title="Current Residence" 
                data={localUser.currentAddress || { street: '', city: '', state: '', country: '', zipCode: '' }} 
                onChange={(f, v) => handleNestedChange('currentAddress', f, v)}
              />
              <div className="flex items-center gap-4">
                <div className="h-px bg-slate-100 flex-1"></div>
                <button 
                  onClick={() => handleInputChange('permanentAddress', localUser.currentAddress)}
                  className="text-[10px] font-black uppercase text-primary-600 hover:text-primary-800 transition-colors bg-primary-50 px-3 py-1 rounded-full"
                >
                  Same as current residence
                </button>
                <div className="h-px bg-slate-100 flex-1"></div>
              </div>
              <AddressSection 
                title="Permanent Address" 
                data={localUser.permanentAddress || { street: '', city: '', state: '', country: '', zipCode: '' }} 
                onChange={(f, v) => handleNestedChange('permanentAddress', f, v)}
              />
            </div>
          )}

          {/* JOB & ORG INFO */}
          {activeTab === 'job' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <section className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-4">Employment Details</h4>
                  <EditableField label="Job Title" value={localUser.jobTitle || ''} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('jobTitle', v)} />
                  <EditableField label="Employment Type" type="select" options={['Permanent', 'Contract', 'Intern']} value={localUser.employmentType || ''} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('employmentType', v)} />
                  <EditableField label="Date of Joining" type="date" value={localUser.joinDate} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('joinDate', v)} />
                  <EditableField label="Probation End Date" type="date" value={localUser.probationEndDate || ''} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('probationEndDate', v)} />
                  <EditableField label="Work Location" value={localUser.workLocation || ''} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('workLocation', v)} />
                </section>
                <section className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-4">Organization & Reporting</h4>
                  <EditableField label="Company Name" value="NexusHR Cloud Systems" readOnly={true} />
                  <EditableField label="Department" value={localUser.department} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('department', v)} />
                  <EditableField label="Reporting Manager" value={managerName} readOnly={true} />
                  <EditableField label="Employee Status" type="select" options={['Active', 'On Leave', 'Terminated']} value={localUser.employeeStatus || 'Active'} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('employeeStatus', v)} />
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField label="Shift Starts" type="time" value={normalizeTimeForInput(localUser.shiftStart)} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('shiftStart', v)} />
                    <EditableField label="Shift Ends" type="time" value={normalizeTimeForInput(localUser.shiftEnd)} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('shiftEnd', v)} />
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* FINANCIAL INFO */}
          {activeTab === 'finance' && (
            <div className="space-y-10">
              <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex gap-4 mb-8">
                <i className="fas fa-shield-alt text-amber-500 text-xl mt-1"></i>
                <div>
                  <h5 className="text-sm font-bold text-amber-800">Confidential Information</h5>
                  <p className="text-xs text-amber-700 mt-1">These details are used for payroll processing. Ensure the bank info is accurate.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <EditableField label="Bank Name" value={localUser.bankDetails?.bankName || ''} onChange={(v: string) => handleNestedChange('bankDetails', 'bankName', v)} />
                <EditableField label="Account Number" value={localUser.bankDetails?.accountNumber || ''} onChange={(v: string) => handleNestedChange('bankDetails', 'accountNumber', v)} />
                <EditableField label="IFSC / SWIFT Code" value={localUser.bankDetails?.ifscCode || ''} onChange={(v: string) => handleNestedChange('bankDetails', 'ifscCode', v)} />
                <EditableField label="PAN / Tax ID" value={localUser.bankDetails?.panNumber || ''} readOnly={!isHRorAdmin} onChange={(v: string) => handleNestedChange('bankDetails', 'panNumber', v)} />
                <EditableField label="PF / Social Security" value={localUser.bankDetails?.socialSecurityNumber || ''} readOnly={!isHRorAdmin} onChange={(v: string) => handleNestedChange('bankDetails', 'socialSecurityNumber', v)} />
                <EditableField label="Payroll Cycle" value={localUser.payrollCycle || 'Monthly'} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('payrollCycle', v)} />
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Verified Documents</h4>
                {isHRorAdmin && (
                  <button 
                    onClick={handleDocumentClick}
                    className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-upload"></i> Upload New
                  </button>
                )}
                <input type="file" ref={documentInputRef} className="hidden" onChange={handleDocumentFileChange} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(localUser.documents || []).length > 0 ? (
                    (localUser.documents || []).map(doc => (
                        <div key={doc.id} className="p-4 border border-slate-100 rounded-2xl flex items-center gap-4 hover:border-primary-200 hover:bg-primary-50/20 transition-all group">
                          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-colors">
                            <i className={`fas ${doc.name.toLowerCase().endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-image'}`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{doc.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-black">{doc.type} • {doc.uploadDate}</p>
                          </div>
                          {(isHRorAdmin || isViewingSelf) && (
                            <button 
                              onClick={() => handleDownloadDocument(doc)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-primary-600"
                              title="Download document"
                            >
                              <i className="fas fa-download text-xs"></i>
                            </button>
                          )}
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-slate-400 italic">No documents found.</div>
                )}
              </div>
            </div>
          )}

          {/* SKILLS & EDUCATION */}
          {activeTab === 'skills' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <section className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-4">Qualifications</h4>
                  <EditableField label="Highest Qualification" value={localUser.highestQualification || ''} onChange={(v: string) => handleInputChange('highestQualification', v)} />
                  <EditableField label="Total Experience" value={localUser.totalExperience || ''} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('totalExperience', v)} />
                  <EditableField label="Previous Experience" value={localUser.priorExperience || ''} readOnly={!isHRorAdmin} onChange={(v: string) => handleInputChange('priorExperience', v)} />
                </section>
                <section className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-4">Professional Profile</h4>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Top Skills (Comma Separated)</label>
                    <div className="space-y-4">
                      <input 
                        type="text"
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        placeholder="e.g. React, Node.js, Leadership"
                        className="w-full px-5 py-3.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 border-slate-100 border rounded-2xl outline-none font-bold transition-all"
                      />
                      <div className="flex flex-wrap gap-2">
                        {(skillsInput.split(',').map(s => s.trim()).filter(s => s !== '') || []).map(skill => (
                          <span key={skill} className="px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-black rounded-lg border border-primary-100 uppercase">{skill}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <EditableField 
                    label="Languages Known (Comma Separated)" 
                    value={languagesInput} 
                    onChange={(v: string) => setLanguagesInput(v)} 
                  />
                </section>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS / SETTINGS */}
          {activeTab === 'notifications' && (
            <div className="space-y-10">
               <div>
                <h3 className="text-lg font-bold text-slate-900">System Preferences</h3>
                <p className="text-sm text-slate-500 mt-1">Manage your in-app experience and security settings.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <section className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">Alerts</h4>
                  <PreferenceToggle 
                    label="Leave Updates" 
                    description="Status changes on applications." 
                    checked={localUser.notificationPreferences?.leaveUpdates ?? true} 
                    onChange={() => handleNestedChange('notificationPreferences', 'leaveUpdates', !(localUser.notificationPreferences?.leaveUpdates ?? true))} 
                  />
                </section>
                <section className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">Security</h4>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Two-Factor Auth</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black">Recommended</p>
                    </div>
                    <button className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl">Enable</button>
                  </div>
                </section>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && isViewingSelf && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10">
              <h3 className="text-2xl font-black text-slate-900 mb-6">Security Update</h3>
              {success ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-3xl shadow-lg shadow-emerald-50"><i className="fas fa-check"></i></div>
                  <h4 className="text-xl font-black text-slate-800">Credentials Updated</h4>
                </div>
              ) : (
                <form onSubmit={handlePasswordUpdate} className="space-y-5">
                  <EditableField label="Current Password" type="password" value={passwordData.current} onChange={(v: string) => setPasswordData({...passwordData, current: v})} />
                  <EditableField label="New Password" type="password" value={passwordData.new} onChange={(v: string) => setPasswordData({...passwordData, new: v})} />
                  <EditableField label="Confirm New Password" type="password" value={passwordData.confirm} onChange={(v: string) => setPasswordData({...passwordData, confirm: v})} />
                  {error && <div className="text-rose-600 text-xs font-bold">{error}</div>}
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 font-bold text-slate-400">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl">Update Key</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal Helper Components for the Profile Page
const EditableField = ({ label, value, onChange, type = 'text', options, readOnly, placeholder }: any) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      {type === 'select' ? (
        <select 
          value={value ?? ''} 
          onChange={(e) => onChange?.(e.target.value)}
          disabled={readOnly}
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 font-bold text-slate-700 disabled:opacity-60 transition-all"
        >
          {options?.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input 
          type={type} 
          value={value ?? ''} 
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 font-bold text-slate-700 disabled:bg-slate-50/50 disabled:text-slate-400 transition-all shadow-sm"
        />
      )}
    </div>
  );
};

const AddressSection = ({ title, data, onChange }: { title: string, data: Address, onChange: (field: keyof Address, value: string) => void }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="md:col-span-2">
          <EditableField label="Street Address" value={data.street} onChange={(v: string) => onChange('street', v)} />
        </div>
        <EditableField label="City" value={data.city} onChange={(v: string) => onChange('city', v)} />
        <EditableField label="State / Province" value={data.state} onChange={(v: string) => onChange('state', v)} />
        <EditableField label="Country" value={data.country} onChange={(v: string) => onChange('country', v)} />
        <EditableField label="Zip / Postal Code" value={data.zipCode} onChange={(v: string) => onChange('zipCode', v)} />
      </div>
    </div>
  );
};

const PreferenceToggle = ({ label, description, checked, onChange }: { label: string, description: string, checked: boolean, onChange: () => void }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-primary-100 transition-all">
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-[10px] text-slate-500 font-medium">{description}</p>
      </div>
      <button 
        type="button"
        onClick={onChange}
        className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${checked ? 'bg-primary-600' : 'bg-slate-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
};

export default ProfilePage;
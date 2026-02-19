
import React, { useState, useEffect } from 'react';
import { SystemConfig } from '../types';

interface SettingsPageProps {
  config: SystemConfig;
  onUpdate: (newConfig: SystemConfig) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ config, onUpdate }) => {
  const [localConfig, setLocalConfig] = useState<SystemConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    setTimeout(() => {
      onUpdate(localConfig);
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 600);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalConfig(prev => ({
      ...prev,
      [name]: e.target.type === 'number' ? parseInt(value) : value
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500">Core organizational configuration hub.</p>
        </div>
        {showSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-4">
            <i className="fas fa-check-circle"></i>
            Settings synchronized with cloud!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Company Identity</h3>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Legal Name</label>
                  <input type="text" name="companyName" value={localConfig.companyName} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Operating Timezone</label>
                  <select name="timezone" value={localConfig.timezone} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none">
                    <option value="UTC+5:30 (IST)">UTC+5:30 (IST) - India</option>
                    <option value="UTC-8 (PST)">UTC-8 (PST) - Pacific</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Attendance Policy</h3>
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Grace Period (Minutes)</label>
                  <input type="number" name="gracePeriodMinutes" value={localConfig.gracePeriodMinutes} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Currency Symbol</label>
                  <input type="text" name="currency" value={localConfig.currency} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Annual Leave Quotas</h3>
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <QuotaInput label="Annual (Days)" name="defaultAnnualLeave" value={localConfig.defaultAnnualLeave} onChange={handleChange} />
                  <QuotaInput label="Sick (Days)" name="defaultSickLeave" value={localConfig.defaultSickLeave} onChange={handleChange} />
                  <QuotaInput label="Casual (Days)" name="defaultCasualLeave" value={localConfig.defaultCasualLeave} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
          <button type="submit" disabled={isSaving} className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-all flex items-center gap-3 disabled:opacity-50">
            {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
            Update Config
          </button>
        </div>
      </form>
    </div>
  );
};

const QuotaInput = ({ label, name, value, onChange }: any) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{label}</label>
    <input type="number" name={name} value={value} onChange={onChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
  </div>
);

export default SettingsPage;

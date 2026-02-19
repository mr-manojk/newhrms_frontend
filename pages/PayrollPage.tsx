
import React, { useState, useMemo, useCallback } from 'react';
import { User, UserRole, SalaryStructure, ExpenseRequest, PayrollRun, ExpenseStatus, BonusIncrement, SystemConfig } from '../types';
import { resolveAvatarUrl } from '../services/apiClient';
import ModalPortal from '../components/ModalPortal';
import { DEFAULT_SALARY_COMPONENTS } from '../constants';

interface PayrollPageProps {
  user: User;
  employees: User[];
  salaryStructures: SalaryStructure[];
  expenses: ExpenseRequest[];
  bonuses: BonusIncrement[];
  payrollRuns: PayrollRun[];
  onUpdateSalaryStructure: (s: SalaryStructure) => Promise<void>;
  onUpdateExpenseStatus: (id: string, status: ExpenseStatus) => Promise<void>;
  onAddBonus: (b: Partial<BonusIncrement>) => Promise<void>;
  onRunPayroll: (month: string, year: number, runs: PayrollRun[]) => Promise<void>;
  systemConfig: SystemConfig;
}

const PayrollPage: React.FC<PayrollPageProps> = ({ 
  user, employees, salaryStructures, expenses, bonuses, payrollRuns,
  onUpdateSalaryStructure, onUpdateExpenseStatus, onAddBonus, onRunPayroll, systemConfig
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'structures' | 'expenses' | 'bonuses' | 'runs'>('overview');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showStructureModal, setShowStructureModal] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isAdminOrHR = user.role === UserRole.ADMIN || user.role === UserRole.HR;
  const components = DEFAULT_SALARY_COMPONENTS;

  /**
   * Helper to retrieve value for a specific component ID from a user's SalaryStructure.
   * Maps snake_case component IDs to camelCase structure properties.
   */
  const getStructVal = useCallback((userId: string, key: string) => {
    const s = salaryStructures.find(struct => String(struct.userId) === String(userId));
    if (!s) return 0;
    
    // Mapping of component IDs to SalaryStructure property names
    const mapping: Record<string, keyof SalaryStructure> = {
      'basic': 'basic',
      'hra': 'hra',
      'attendance_bonus': 'attendanceBonus',
      'transport_allowance': 'transportAllowance',
      'conveyance_allowance': 'conveyanceAllowance',
      'medical_allowance': 'medicalAllowance',
      'performance_incentives': 'performanceIncentives',
      'internet_allowance': 'internetAllowance',
      'pf': 'pf',
      'tax': 'tax',
      'pt': 'pt'
    };
    
    if (mapping[key]) {
      const prop = mapping[key];
      const val = s[prop];
      return typeof val === 'number' ? val : 0;
    }
    
    // Fallback for custom components in the components Record
    return Number(s.components?.[key] || 0);
  }, [salaryStructures]);

  const totalSalaries = useMemo(() => 
    salaryStructures.reduce((sum, s) => {
      let rowSum = 0;
      components.filter(c => c.type === 'EARNING').forEach(c => {
        rowSum += getStructVal(s.userId, c.id);
      });
      return sum + rowSum;
    }, 0), 
  [salaryStructures, components, getStructVal]);

  const pendingExpenses = useMemo(() => expenses.filter(e => e.status === ExpenseStatus.PENDING), [expenses]);

  const handleRunPayrollProcess = async () => {
    if (!confirm(`Start payroll run for ${selectedMonth}? This will generate permanent payslips for all active employees.`)) return;
    
    setIsProcessing(true);
    try {
      const runs: PayrollRun[] = employees.filter(e => e.employeeStatus === 'Active').map(emp => {
        const struct = salaryStructures.find(s => String(s.userId) === String(emp.id));
        
        const monthBonuses = bonuses.filter(b => String(b.userId) === String(emp.id) && b.effectiveDate.startsWith(selectedMonth) && !b.isProcessed);
        const bonusTotal = monthBonuses.reduce((sum, b) => sum + Number(b.amount || 0), 0);
        
        const monthExps = expenses.filter(e => String(e.userId) === String(emp.id) && e.status === ExpenseStatus.APPROVED);
        const expTotal = monthExps.reduce((sum, e) => sum + Number(e.amount || 0), 0);

        let gross = bonusTotal;
        let deductions = 0;
        const snapshot: Record<string, number> = {};
        
        // Build snapshot and calculate totals from SalaryStructure
        components.forEach(comp => {
          const val = getStructVal(emp.id, comp.id);
          snapshot[comp.id] = val; // Snapshot key must match comp.id for display
          if (comp.type === 'EARNING') gross += val;
          else if (comp.type === 'DEDUCTION') deductions += val;
        });

        return {
          id: Math.random().toString(36).substr(2, 9),
          userId: emp.id,
          month: selectedMonth,
          year: parseInt(selectedMonth.split('-')[0]),
          grossSalary: gross,
          netSalary: (gross - deductions) + expTotal,
          deductions,
          reimbursements: expTotal,
          bonus: bonusTotal,
          status: 'PAID',
          processedDate: new Date().toISOString(),
          attendanceDays: 22, // Static for demo, could be calculated from attendances
          componentBreakdown: snapshot
        };
      });

      await onRunPayroll(selectedMonth.split('-')[1], parseInt(selectedMonth.split('-')[0]), runs);
      alert("Payroll run completed. All payslips generated and synchronized with database.");
    } catch (err) {
      console.error("Payroll process failed:", err);
      alert("Error generating payroll. Check console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payroll Management</h1>
          <p className="text-slate-500 font-medium">Administration of structured salary components and payout runs.</p>
        </div>
        <div className="flex items-center gap-4">
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm shadow-sm outline-none" />
          <button onClick={handleRunPayrollProcess} disabled={isProcessing || !isAdminOrHR} className="px-8 py-2.5 bg-primary-600 text-white font-black uppercase text-[11px] rounded-xl shadow-lg hover:bg-primary-700 transition-all flex items-center gap-2 disabled:opacity-50">
            {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-play"></i>}
            Run Payroll
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="flex overflow-x-auto no-scrollbar border-b border-slate-100 p-2">
          {[
            { id: 'overview', label: 'Dashboard', icon: 'fa-chart-pie' },
            { id: 'structures', label: 'Salary Structures', icon: 'fa-hand-holding-dollar' },
            { id: 'expenses', label: 'Reimbursements', icon: 'fa-receipt' },
            { id: 'runs', label: 'History', icon: 'fa-history' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all rounded-2xl ${activeTab === tab.id ? 'bg-primary-50 text-primary-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
              <i className={`fas ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Monthly Liability" value={totalSalaries} icon="fa-money-bill-wave" color="primary" />
                <StatCard label="Pending Expenses" value={pendingExpenses.length} icon="fa-receipt" color="amber" />
                <StatCard label="Sync Status" value="Online" icon="fa-database" color="indigo" />
              </div>
            </div>
          )}

          {activeTab === 'structures' && (
            <div className="space-y-6">
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Estimated Gross</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map(emp => {
                      const struct = salaryStructures.find(s => String(s.userId) === String(emp.id));
                      let gross = 0;
                      if (struct) {
                        components.filter(c => c.type === 'EARNING').forEach(c => {
                          gross += getStructVal(emp.id, c.id);
                        });
                      }
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <img src={resolveAvatarUrl(emp.avatar)} className="w-8 h-8 rounded-full border border-slate-100" />
                            <p className="text-xs font-bold text-slate-800">{emp.name}</p>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${struct ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                               {struct ? 'Configured' : 'Missing'}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-primary-600">{gross.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => setShowStructureModal(emp)} className="px-4 py-2 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-lg hover:bg-primary-600 hover:text-white transition-all">Edit Structure</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
             <div className="space-y-6">
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Requester</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50 text-xs">
                          <td className="px-6 py-4 font-bold">{exp.userName}</td>
                          <td className="px-6 py-4">{exp.category}</td>
                          <td className="px-6 py-4">{Number(exp.amount || 0).toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                              exp.status === ExpenseStatus.APPROVED ? 'bg-emerald-50 text-emerald-500' :
                              exp.status === ExpenseStatus.PAID ? 'bg-primary-50 text-primary-500' :
                              exp.status === ExpenseStatus.REJECTED ? 'bg-rose-50 text-rose-500' :
                              'bg-amber-50 text-amber-600'
                            }`}>{exp.status}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {exp.status === ExpenseStatus.PENDING && isAdminOrHR && (
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => onUpdateExpenseStatus(exp.id, ExpenseStatus.APPROVED)} className="text-emerald-600 font-bold hover:underline">Approve</button>
                                <button onClick={() => onUpdateExpenseStatus(exp.id, ExpenseStatus.REJECTED)} className="text-rose-600 font-bold hover:underline">Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic">No reimbursement requests.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
          )}

          {activeTab === 'runs' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Month</th>
                      <th className="px-6 py-4">Gross</th>
                      <th className="px-6 py-4">Net Payout</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payrollRuns.map(run => (
                      <tr key={run.id} className="hover:bg-slate-50 text-xs">
                        <td className="px-6 py-4 font-bold">{employees.find(e => String(e.id) === String(run.userId))?.name}</td>
                        <td className="px-6 py-4">{run.month}/{run.year}</td>
                        <td className="px-6 py-4">{Number(run.grossSalary || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 font-black text-emerald-600">{Number(run.netSalary || 0).toLocaleString()}</td>
                        <td className="px-6 py-4"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase border rounded">PAID</span></td>
                      </tr>
                    ))}
                    {payrollRuns.length === 0 && (
                      <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic">No historical runs recorded.</td></tr>
                    )}
                  </tbody>
                </table>
            </div>
          )}
        </div>
      </div>

      <ModalPortal isOpen={!!showStructureModal} onClose={() => setShowStructureModal(null)}>
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
          <div className="p-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-black text-slate-900">Define Salary Structure</h3>
                <button onClick={() => setShowStructureModal(null)} className="text-slate-300 hover:text-rose-500 transition-colors"><i className="fas fa-times text-xl"></i></button>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Configuring payout components for {showStructureModal?.name}</p>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!showStructureModal) return;
                const fd = new FormData(e.target as HTMLFormElement);
                
                const structure: SalaryStructure = {
                  userId: showStructureModal.id,
                  basic: Number(fd.get('basic') || 0),
                  hra: Number(fd.get('hra') || 0),
                  attendanceBonus: Number(fd.get('attendance_bonus') || 0),
                  transportAllowance: Number(fd.get('transport_allowance') || 0),
                  conveyanceAllowance: Number(fd.get('conveyance_allowance') || 0),
                  medicalAllowance: Number(fd.get('medical_allowance') || 0),
                  performanceIncentives: Number(fd.get('performance_incentives') || 0),
                  internetAllowance: Number(fd.get('internet_allowance') || 0),
                  pf: Number(fd.get('pf') || 0),
                  tax: Number(fd.get('tax') || 0),
                  pt: Number(fd.get('pt') || 0),
                  components: {}, 
                  lastUpdated: new Date().toISOString()
                };
                
                await onUpdateSalaryStructure(structure);
                setShowStructureModal(null);
              }} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 max-h-[55vh] overflow-y-auto pr-2 no-scrollbar">
                  <section className="space-y-5">
                      <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-widest border-b border-primary-50 pb-2 mb-4">Earnings</h4>
                      {components.filter(c => c.type === 'EARNING').map(c => (
                        <PayrollInput key={c.id} label={c.name} name={c.id} defaultValue={getStructVal(showStructureModal?.id || '', c.id)} />
                      ))}
                  </section>
                  <section className="space-y-5">
                      <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest border-b border-rose-50 pb-2 mb-4">Deductions</h4>
                      {components.filter(c => c.type === 'DEDUCTION').map(c => (
                        <PayrollInput key={c.id} label={c.name} name={c.id} defaultValue={getStructVal(showStructureModal?.id || '', c.id)} />
                      ))}
                  </section>
                </div>
                
                <div className="pt-6 border-t border-slate-50 flex gap-4">
                  <button type="button" onClick={() => setShowStructureModal(null)} className="flex-1 py-4 text-slate-400 font-bold text-sm uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="flex-[2] py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all active:scale-[0.98]">Sync Salary Structure</button>
                </div>
              </form>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
    <div className={`w-14 h-14 bg-${color}-50 text-${color}-600 rounded-[1.25rem] flex items-center justify-center text-xl`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <h4 className="text-2xl font-black text-slate-800">{typeof value === 'number' ? value.toLocaleString() : value}</h4>
    </div>
  </div>
);

const PayrollInput = ({ label, name, defaultValue }: any) => (
  <div className="space-y-1.5 group">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-primary-600 transition-colors">{label}</label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
        <i className="fas fa-coins text-xs"></i>
      </div>
      <input 
        name={name} 
        type="number" 
        step="0.01"
        placeholder="0.00"
        defaultValue={defaultValue || 0} 
        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all" 
      />
    </div>
  </div>
);

export default PayrollPage;

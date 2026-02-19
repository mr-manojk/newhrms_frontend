
import React, { useState, useMemo } from 'react';
import { User, PayrollRun, ExpenseRequest, SalaryStructure, ExpenseStatus, SystemConfig, SalaryComponent, Holiday } from '../types';
import ModalPortal from '../components/ModalPortal';
import { DEFAULT_SALARY_COMPONENTS } from '../constants';

interface PayrollHistoryPageProps {
  user: User;
  payrollRuns: PayrollRun[];
  expenses: ExpenseRequest[];
  salaryStructures: SalaryStructure[];
  onAddExpense: (exp: Partial<ExpenseRequest>) => Promise<void>;
  systemConfig: SystemConfig;
  holidays: Holiday[];
}

const safeFormatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length === 2) {
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convertChunk = (n: number): string => {
    if (n < 20) return units[n];
    const unit = n % 10;
    const ten = Math.floor(n / 10);
    return tens[ten] + (unit ? ' ' + units[unit] : '');
  };

  const convertThreeDigit = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred) res += units[hundred] + ' Hundred ';
    if (rest) res += (res ? 'and ' : '') + convertChunk(rest);
    return res.trim();
  };

  let result = '';
  let integerPart = Math.floor(num);
  
  if (integerPart >= 10000000) { result += convertThreeDigit(Math.floor(integerPart / 10000000)) + ' Crore '; integerPart %= 10000000; }
  if (integerPart >= 100000) { result += convertThreeDigit(Math.floor(integerPart / 100000)) + ' Lakh '; integerPart %= 100000; }
  if (integerPart >= 1000) { result += convertThreeDigit(Math.floor(integerPart / 1000)) + ' Thousand '; integerPart %= 1000; }
  if (integerPart > 0) result += convertThreeDigit(integerPart);

  return result.trim() + ' Only';
};

const PayrollHistoryPage: React.FC<PayrollHistoryPageProps> = ({ 
  user, payrollRuns = [], expenses = [], salaryStructures = [], onAddExpense, systemConfig, holidays = []
}) => {
  const [activeTab, setActiveTab] = useState<'payslips' | 'reimbursements' | 'snapshot'>('payslips');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);

  const myRuns = useMemo(() => {
    return (payrollRuns || [])
      .filter(r => r && String(r.userId) === String(user?.id))
      .sort((a, b) => String(b.month || '').localeCompare(String(a.month || '')));
  }, [payrollRuns, user?.id]);

  const myExpenses = useMemo(() => {
    return (expenses || [])
      .filter(e => e && String(e.userId) === String(user?.id))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [expenses, user?.id]);

  const myStructure = useMemo(() => {
    return (salaryStructures || []).find(s => s && String(s.userId) === String(user?.id)) || null;
  }, [salaryStructures, user?.id]);

  const getBreakdownValue = (run: PayrollRun | null, componentId: string): number => {
    if (!run || !run.componentBreakdown) return 0;
    if (run.componentBreakdown[componentId] !== undefined) return Number(run.componentBreakdown[componentId]);
    const camelId = componentId.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    if (run.componentBreakdown[camelId] !== undefined) return Number(run.componentBreakdown[camelId]);
    return 0;
  };

  const getComponentValueFromStructure = (struct: SalaryStructure | null, componentId: string): number => {
    if (!struct) return 0;
    const mapping: Record<string, keyof SalaryStructure> = {
      'basic': 'basic', 'hra': 'hra', 'attendance_bonus': 'attendanceBonus', 
      'transport_allowance': 'transportAllowance', 'conveyance_allowance': 'conveyanceAllowance',
      'medical_allowance': 'medicalAllowance', 'performance_incentives': 'performanceIncentives',
      'internet_allowance': 'internetAllowance', 'pf': 'pf', 'tax': 'tax', 'pt': 'pt'
    };
    if (mapping[componentId]) {
      const val = struct[mapping[componentId]];
      return typeof val === 'number' ? val : 0;
    }
    return Number(struct.components?.[componentId] || 0);
  };

  const stats = useMemo(() => {
    const totalNet = myRuns.reduce((sum, r) => sum + Number(r.netSalary || 0), 0);
    const avgNet = myRuns.length > 0 ? totalNet / myRuns.length : 0;
    const pendingCount = myExpenses.filter(e => e.status === ExpenseStatus.PENDING).length;
    return { totalNet, avgNet, pendingCount };
  }, [myRuns, myExpenses]);

  const earnings = useMemo(() => DEFAULT_SALARY_COMPONENTS.filter(c => c.type === 'EARNING'), []);
  const deductions = useMemo(() => DEFAULT_SALARY_COMPONENTS.filter(c => c.type === 'DEDUCTION'), []);

  const annualCTC = useMemo(() => {
    if (!myStructure) return 0;
    const monthlyGross = earnings.reduce((sum, c) => sum + getComponentValueFromStructure(myStructure, c.id), 0);
    return monthlyGross * 12;
  }, [myStructure, earnings]);

  const paidHolidaysCount = useMemo(() => {
    if (!selectedRun) return 0;
    const parts = selectedRun.month.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    return (holidays || []).filter(h => {
        const d = new Date(h.date);
        return d.getFullYear() === y && (d.getMonth() + 1) === m;
    }).length;
  }, [selectedRun, holidays]);

  const verificationQrUrl = useMemo(() => {
    if (!selectedRun) return undefined;
    const verificationData = `VERIFIED-PAYSLIP|Emp:${user.employeeId}|Period:${selectedRun.month}|Net:${selectedRun.netSalary}|ID:${selectedRun.id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationData)}`;
  }, [selectedRun, user.employeeId]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Pay & Expenses</h1>
          <p className="text-slate-500 text-sm font-medium">Verified historical payroll statements.</p>
        </div>
        <button onClick={() => setShowExpenseModal(true)} className="px-6 py-2.5 bg-primary-600 text-white font-bold uppercase tracking-wider text-[10px] rounded-xl shadow-md hover:bg-primary-700 transition-all flex items-center gap-2">
          <i className="fas fa-plus text-[9px]"></i> File Claim
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Net Received</p>
          <p className="text-2xl font-black text-slate-800">{systemConfig.currency} {stats.totalNet.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Take-home</p>
          <p className="text-2xl font-black text-slate-800">{systemConfig.currency} {stats.avgNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Claims</p>
          <p className="text-2xl font-black text-amber-600">{stats.pendingCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto no-scrollbar border-b border-slate-100 p-2 gap-1">
          <TabBtn id="payslips" label="Payslips" icon="fa-file-invoice-dollar" active={activeTab === 'payslips'} onClick={() => setActiveTab('payslips')} />
          <TabBtn id="reimbursements" label="Claims" icon="fa-receipt" active={activeTab === 'reimbursements'} onClick={() => setActiveTab('reimbursements')} />
          <TabBtn id="snapshot" label="Salary Package" icon="fa-box-open" active={activeTab === 'snapshot'} onClick={() => setActiveTab('snapshot')} />
        </div>

        <div className="p-6">
          {activeTab === 'payslips' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myRuns.map(run => (
                <div key={run.id} className="p-6 border border-slate-100 rounded-3xl hover:border-primary-200 hover:bg-primary-50/10 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-file-invoice"></i></div>
                    <button onClick={() => setSelectedRun(run)} className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline">View Statement</button>
                  </div>
                  <h4 className="text-lg font-black text-slate-800">{safeFormatDate(run.month)}</h4>
                  <div className="mt-4 flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Disbursed</p>
                      <p className="text-lg font-black text-emerald-600">{systemConfig.currency} {run.netSalary.toLocaleString()}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase border rounded">PAID</span>
                  </div>
                </div>
              ))}
              {myRuns.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 italic">No payslips found in records.</div>}
            </div>
          )}

          {activeTab === 'reimbursements' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100">
                  <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Description</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3 text-right">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50 text-xs">
                      <td className="px-6 py-4 font-medium">{exp.date}</td>
                      <td className="px-6 py-4 font-bold">{exp.category}</td>
                      <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{exp.description}</td>
                      <td className="px-6 py-4 font-black">{systemConfig.currency} {exp.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${exp.status === ExpenseStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : exp.status === ExpenseStatus.PAID ? 'bg-primary-50 text-primary-600 border-primary-100' : exp.status === ExpenseStatus.REJECTED ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{exp.status}</span></td>
                    </tr>
                  ))}
                  {myExpenses.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">No claims filed yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'snapshot' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Monthly Breakdown</h3>
                <div className="space-y-3">
                  {earnings.map(c => (
                    <div key={c.id} className="flex justify-between text-sm"><span className="text-slate-500">{c.name}</span><span className="font-bold">{systemConfig.currency} {getComponentValueFromStructure(myStructure, c.id).toLocaleString()}</span></div>
                  ))}
                  <div className="pt-2 border-t border-slate-50 flex justify-between font-black text-primary-600"><span>Monthly Gross</span><span>{systemConfig.currency} {earnings.reduce((sum, c) => sum + getComponentValueFromStructure(myStructure, c.id), 0).toLocaleString()}</span></div>
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Annual Package (CTC)</h3>
                <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white text-center shadow-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Verified Cost to Company</p>
                  <p className="text-5xl font-black">{systemConfig.currency} {annualCTC.toLocaleString()}</p>
                  <div className="mt-6 flex justify-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span><span className="text-[10px] font-bold text-primary-400 uppercase tracking-tighter">Active Contract</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- SEPARATE PRINT VIEW (Hidden in UI) --- */}
      <div id="pdf-export-view" className="bg-white text-slate-900 pt-4 px-10 pb-10 leading-normal">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{systemConfig.companyName}</h1>
            <p className="text-xs font-bold text-slate-500 tracking-widest mt-0.5">OFFICIAL PAYSLIP STATEMENT</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-slate-800">Month: {safeFormatDate(selectedRun?.month)}</h2>
            <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5 uppercase">Ref ID: {selectedRun?.id?.toUpperCase() || 'TXN-A9X1V'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-12 mb-6 border border-slate-200 p-5 rounded-lg bg-slate-50/30">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p className="font-bold text-slate-500 uppercase tracking-tight">Employee Name</p>
            <p className="font-black text-slate-900 uppercase">: {user.name}</p>
            <p className="font-bold text-slate-500 uppercase tracking-tight">Designation</p>
            <p className="font-black text-slate-900 uppercase">: {user.jobTitle || 'N/A'}</p>
            <p className="font-bold text-slate-500 uppercase tracking-tight">Employee Code</p>
            <p className="font-black text-slate-900 uppercase">: {user.employeeId}</p>
            <p className="font-bold text-slate-500 uppercase tracking-tight">Department</p>
            <p className="font-black text-slate-900 uppercase">: {user.department}</p>
            <p className="font-bold text-slate-500 uppercase tracking-tight">Branch/Location</p>
            <p className="font-black text-slate-900 uppercase">: {user.workLocation || 'Corporate HQ'}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p className="font-bold text-slate-500 uppercase tracking-tight">Pay Channel</p>
            <p className="font-black text-slate-900 uppercase">: {user.bankDetails?.bankName || 'BANK'}</p>
            <p className="font-bold text-slate-500 uppercase tracking-tight">UAN Number</p>
            <p className="font-black text-slate-900 uppercase">: {user.bankDetails?.uanNumber || 'N/A'}</p>
            <p className="font-bold text-slate-500 uppercase tracking-tight">Working Days</p>
            <p className="font-black text-slate-900 uppercase">: {selectedRun?.attendanceDays || 0}</p>
            <p className="font-bold text-slate-500 uppercase tracking-tight">Paid Holidays</p>
            <p className="font-black text-slate-900 uppercase">: {paidHolidaysCount}</p>
            <p className="font-bold text-slate-500 uppercase tracking-tight">PF A/C Number</p>
            <p className="font-black text-slate-900 uppercase">: {user.bankDetails?.pfNumber || 'N/A'}</p>
          </div>
        </div>

        <table className="w-full border-collapse border border-slate-300 mb-6">
          <thead>
            <tr className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-700">
              <th className="border border-slate-300 p-3 text-left w-1/2">Earnings Breakdown</th>
              <th className="border border-slate-300 p-3 text-right">Amount</th>
              <th className="border border-slate-300 p-3 text-left w-1/2">Deductions Breakdown</th>
              <th className="border border-slate-300 p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {Array.from({ length: Math.max(earnings.length, deductions.length) }).map((_, i) => {
              const e = earnings[i];
              const d = deductions[i];
              const eVal = e ? getBreakdownValue(selectedRun, e.id) : null;
              const dVal = d ? getBreakdownValue(selectedRun, d.id) : null;
              return (
                <tr key={i} className="h-8">
                  <td className="border border-slate-300 px-4 py-1.5 font-medium">{e?.name || ''}</td>
                  <td className="border border-slate-300 px-4 py-1.5 text-right font-bold">{eVal !== null ? eVal.toLocaleString() : ''}</td>
                  <td className="border border-slate-300 px-4 py-1.5 font-medium">{d?.name || ''}</td>
                  <td className="border border-slate-300 px-4 py-1.5 text-right font-bold text-rose-700">{dVal !== null ? dVal.toLocaleString() : ''}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 text-xs font-black">
            <tr className="h-10">
              <td className="border border-slate-300 px-4 py-2 uppercase">Total Gross Salary</td>
              <td className="border border-slate-300 px-4 py-2 text-right">{selectedRun?.grossSalary.toLocaleString()}</td>
              <td className="border border-slate-300 px-4 py-2 uppercase">Total Statutory Deductions</td>
              <td className="border border-slate-300 px-4 py-2 text-right text-rose-700">{selectedRun?.deductions.toLocaleString()}</td>
            </tr>
            <tr className="h-12 bg-slate-900 text-white">
              <td colSpan={2} className="border border-slate-300 px-4 py-2 uppercase text-[9px]">
                Net Payout (Words): <br/>
                <span className="text-primary-300 normal-case italic font-medium">{numberToWords(selectedRun?.netSalary || 0)} Only</span>
              </td>
              <td className="border border-slate-300 px-4 py-2 uppercase text-[9px]">
                Total Net Payable
              </td>
              <td className="border border-slate-300 px-4 py-2 text-right text-lg font-black">
                {systemConfig.currency} {selectedRun?.netSalary.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="bg-slate-900 text-white p-6 rounded-lg flex justify-between items-center mb-6 shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-300 mb-0.5">Net Payable Amount</p>
            <h3 className="text-3xl font-black">{systemConfig.currency} {selectedRun?.netSalary.toLocaleString()}</h3>
            <p className="text-xs font-bold italic text-slate-400 mt-1">Rupees {numberToWords(selectedRun?.netSalary || 0)}</p>
          </div>
          <div className="text-right">
             <div className="w-20 h-20 bg-white p-1.5 rounded-lg flex items-center justify-center mx-auto mb-1">
                {verificationQrUrl && <img src={verificationQrUrl} alt="Verify Statement" className="w-full h-full object-contain" />}
             </div>
             <p className="text-[7px] font-bold text-slate-400 uppercase">Digitally Verified</p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-20">
          <div className="text-center">
            <div className="h-px w-48 bg-slate-300 mx-auto mb-3"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employee Signature</p>
          </div>
          <div className="text-center">
            <div className="h-px w-48 bg-slate-300 mx-auto mb-3"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorized Signatory</p>
          </div>
        </div>
        
        <div className="mt-8 text-center">
           <p className="text-[8px] text-slate-400 italic">This document is a computer-generated salary statement and does not require a physical signature for authentication.</p>
           <p className="text-[7px] font-black text-slate-300 uppercase mt-1 tracking-[0.2em]">Generated on {new Date().toLocaleString()} via MyHR Secure Node</p>
        </div>
      </div>

      {/* --- UI COMPACT MODAL --- */}
      <ModalPortal isOpen={!!selectedRun} onClose={() => setSelectedRun(null)}>
        <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200">
          <div className="p-6 md:p-8">
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center text-lg font-black">HR</div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">{systemConfig.companyName}</h2>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Statement: {safeFormatDate(selectedRun?.month)}</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                 <button onClick={() => window.print()} className="px-3 py-1.5 bg-slate-100 text-slate-600 font-black text-[9px] uppercase rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2 shadow-sm"><i className="fas fa-print"></i> PDF/Print</button>
              </div>
            </div>

            <div className="mb-5 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-y-3 gap-x-4 text-[9px]">
                <div className="col-span-2 md:col-span-1"><p className="font-black text-slate-400 uppercase tracking-tighter">Name</p><p className="font-bold text-slate-800 truncate uppercase">{user.name}</p></div>
                <div><p className="font-black text-slate-400 uppercase tracking-tighter">Designation</p><p className="font-bold text-slate-800 truncate uppercase">{user.jobTitle || 'N/A'}</p></div>
                <div><p className="font-black text-slate-400 uppercase tracking-tighter">Code</p><p className="font-mono font-bold text-slate-800 uppercase">{user.employeeId}</p></div>
                <div><p className="font-black text-slate-400 uppercase tracking-tighter">Dept</p><p className="font-bold text-slate-800 truncate uppercase">{user.department}</p></div>
                <div><p className="font-black text-slate-400 uppercase tracking-tighter">Location</p><p className="font-bold text-slate-800 truncate uppercase">{user.workLocation || 'HO'}</p></div>
                <div><p className="font-black text-slate-400 uppercase tracking-tighter">Pay By</p><p className="font-bold text-slate-800 uppercase truncate">{user.bankDetails?.bankName || 'BANK'}</p></div>
                <div><p className="font-black text-slate-400 uppercase tracking-tighter">UAN</p><p className="font-mono font-bold text-slate-800 uppercase">{user.bankDetails?.uanNumber || 'N/A'}</p></div>
                <div><p className="font-black text-slate-400 uppercase tracking-tighter">Days</p><p className="font-bold text-slate-800 uppercase">{selectedRun?.attendanceDays || 0}</p></div>
                <div><p className="font-black text-slate-400 uppercase tracking-tighter">Holidays</p><p className="font-bold text-slate-800 uppercase">{paidHolidaysCount}</p></div>
                <div><p className="font-black text-slate-400 uppercase tracking-tighter">PF No</p><p className="font-mono font-bold text-slate-800 uppercase">{user.bankDetails?.pfNumber || 'N/A'}</p></div>
              </div>
            </div>

            <div className="mb-5 overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-[8px] font-black uppercase text-slate-500 tracking-widest">
                      <th className="px-3 py-2 text-left border-r border-slate-200 w-[35%]">Earnings</th>
                      <th className="px-3 py-2 text-right border-r border-slate-200 w-[15%]">Amount</th>
                      <th className="px-3 py-2 text-left border-r border-slate-200 w-[35%]">Deductions</th>
                      <th className="px-3 py-2 text-right w-[15%]">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10px]">
                    {Array.from({ length: Math.max(earnings.length, deductions.length) }).map((_, i) => {
                      const e = earnings[i];
                      const d = deductions[i];
                      const eVal = e ? getBreakdownValue(selectedRun, e.id) : null;
                      const dVal = d ? getBreakdownValue(selectedRun, d.id) : null;
                      return (
                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/30 transition-colors">
                          <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{e?.name || ''}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-800 border-r border-slate-200">{eVal !== null ? (eVal > 0 ? eVal.toLocaleString() : '-') : ''}</td>
                          <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{d?.name || ''}</td>
                          <td className="px-3 py-2 text-right font-bold text-rose-600">{dVal !== null ? (dVal > 0 ? dVal.toLocaleString() : '-') : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-black border-t border-slate-200 text-[9px]">
                    <tr>
                      <td className="px-3 py-2 uppercase tracking-widest text-slate-400 border-r border-slate-200 text-[8px]">Gross</td>
                      <td className="px-3 py-2 text-right border-r border-slate-200">{selectedRun?.grossSalary.toLocaleString()}</td>
                      <td className="px-3 py-2 uppercase tracking-widest text-slate-400 border-r border-slate-200 text-[8px]">Deductions</td>
                      <td className="px-3 py-2 text-right text-rose-600">{selectedRun?.deductions.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-primary-50">
                      <td colSpan={2} className="px-3 py-2 border-r border-slate-200 border-t border-slate-200">
                        <span className="text-[7px] font-black text-primary-400 uppercase block">Net Payout (Words)</span>
                        <span className="text-[9px] font-bold text-slate-600 normal-case">{numberToWords(selectedRun?.netSalary || 0)} Only</span>
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 border-t border-slate-200 uppercase text-[8px] tracking-tighter">Net Payable</td>
                      <td className="px-3 py-2 border-t border-slate-200 text-right text-sm font-black text-primary-600">
                        {systemConfig.currency} {selectedRun?.netSalary.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
            </div>

            <div className="bg-slate-900 p-5 rounded-[1rem] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-primary-600 opacity-5 -z-10"></div>
              <div className="relative z-10 text-center sm:text-left">
                <p className="text-[7px] font-black text-primary-300 uppercase tracking-widest mb-0.5">Net Payout</p>
                <p className="text-xl font-black text-white">{systemConfig.currency} {selectedRun?.netSalary.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-white p-1 rounded-lg">
                    {verificationQrUrl && <img src={verificationQrUrl} alt="QR" className="w-full h-full" />}
                 </div>
                 <button onClick={() => setSelectedRun(null)} className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>

      <ModalPortal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)}>
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in duration-200">
          <h3 className="text-2xl font-black text-slate-800 mb-6">File Reimbursement</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const target = e.target as any;
            await onAddExpense({ category: target.category.value, amount: parseFloat(target.amount.value), description: target.description.value, date: target.date.value });
            setShowExpenseModal(false);
          }} className="space-y-4">
            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label><select name="category" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"><option value="Travel">Travel</option><option value="Food">Food & Subsistence</option><option value="Equipment">Hardware/Software</option><option value="Other">Miscellaneous</option></select></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount ({systemConfig.currency})</label><input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label><input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label><textarea name="description" required placeholder="Business justification..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none min-h-[80px]" /></div>
            <div className="flex gap-4 pt-4"><button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 font-bold text-slate-400">Cancel</button><button type="submit" className="flex-1 py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg">Submit Claim</button></div>
          </form>
        </div>
      </ModalPortal>
    </div>
  );
};

const TabBtn = ({ label, icon, active, onClick }: any) => (
  <button onClick={onClick} className={`px-6 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all rounded-xl ${active ? 'bg-primary-50 text-primary-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
    <i className={`fas ${icon} text-sm`}></i>{label}
  </button>
);

export default PayrollHistoryPage;

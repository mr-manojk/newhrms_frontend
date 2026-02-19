
import { SalaryStructure, ExpenseRequest, BonusIncrement, PayrollRun } from '../types';
import { API_BASE_URL, handleResponse, safeFetch } from './apiClient';

export const payrollService = {
  // Salary Structures
  async getSalaryStructures(): Promise<SalaryStructure[]> {
    const res = await safeFetch(`${API_BASE_URL}/payroll/salary-structures`, { cache: 'no-store' });
    if (!res) return [];
    return await handleResponse(res, "getSalaryStructures");
  },

  async saveSalaryStructures(structures: SalaryStructure[]): Promise<void> {
    const res = await safeFetch(`${API_BASE_URL}/payroll/salary-structures/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structures })
    });
    if (res) await handleResponse(res, "saveSalaryStructures");
  },

  // Expenses
  async getExpenses(): Promise<ExpenseRequest[]> {
    const res = await safeFetch(`${API_BASE_URL}/payroll/expenses`, { cache: 'no-store' });
    if (!res) return [];
    return await handleResponse(res, "getExpenses");
  },

  async saveExpenses(expenses: ExpenseRequest[]): Promise<void> {
    const res = await safeFetch(`${API_BASE_URL}/payroll/expenses/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses })
    });
    if (res) await handleResponse(res, "saveExpenses");
  },

  // Bonuses & Increments
  async getBonusIncrements(): Promise<BonusIncrement[]> {
    const res = await safeFetch(`${API_BASE_URL}/payroll/bonuses`, { cache: 'no-store' });
    if (!res) return [];
    return await handleResponse(res, "getBonusIncrements");
  },

  async saveBonusIncrements(bonuses: BonusIncrement[]): Promise<void> {
    const res = await safeFetch(`${API_BASE_URL}/payroll/bonuses/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bonuses })
    });
    if (res) await handleResponse(res, "saveBonusIncrements");
  },

  // Payroll Runs (Payslips)
  async getPayrollRuns(): Promise<PayrollRun[]> {
    const res = await safeFetch(`${API_BASE_URL}/payroll/runs`, { cache: 'no-store' });
    if (!res) return [];
    return await handleResponse(res, "getPayrollRuns");
  },

  async savePayrollRuns(runs: PayrollRun[]): Promise<void> {
    const res = await safeFetch(`${API_BASE_URL}/payroll/runs/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runs })
    });
    if (res) await handleResponse(res, "savePayrollRuns");
  }
};

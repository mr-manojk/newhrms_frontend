
import { LeaveRequest, LeaveBalance } from '../types';
import { API_BASE_URL, handleResponse, cleanDateStr } from './apiClient';

export const leaveService = {
  async getLeaves(): Promise<LeaveRequest[]> {
    const res = await fetch(`${API_BASE_URL}/leaves`, { cache: 'no-store' });
    const serverData = await handleResponse(res, "getLeaves");
    if (!serverData) return [];
    return serverData.map((l: any) => ({
      ...l,
      startDate: cleanDateStr(l.startDate),
      endDate: cleanDateStr(l.endDate),
      appliedDate: cleanDateStr(l.appliedDate)
    }));
  },

  async saveLeaves(leaves: LeaveRequest[]): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/leaves/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaves })
    });
    await handleResponse(res, "saveLeaves");
  },

  async getBalances(): Promise<LeaveBalance[]> {
    const res = await fetch(`${API_BASE_URL}/leave-balances`, { cache: 'no-store' });
    const serverData = await handleResponse(res, "getBalances");
    return serverData || [];
  },

  async saveBalances(balances: LeaveBalance[]): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/leave-balances/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balances })
    });
    await handleResponse(res, "saveBalances");
  }
};

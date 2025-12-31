
import { Holiday, SystemConfig, Notification } from '../types';
import { API_BASE_URL, handleResponse, cleanDateStr, safeFetch } from './apiClient';

export const NOTIFICATIONS_UPDATED_EVENT = 'nexushr_notifications_updated';

export const systemService = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getHolidays(): Promise<Holiday[]> {
    const res = await safeFetch(`${API_BASE_URL}/holidays`, { cache: 'no-store' });
    if (!res) return [];
    const serverData = await handleResponse(res, "getHolidays");
    if (!serverData) return [];
    return serverData.map((h: any) => ({ 
      ...h, 
      date: cleanDateStr(h.date),
      frzInd: h.frzInd === true || h.frzInd === 1 || h.frzInd === "1"
    }));
  },

  async saveHolidays(holidays: Holiday[]): Promise<void> {
    const res = await safeFetch(`${API_BASE_URL}/holidays/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holidays })
    });
    if (res) await handleResponse(res, "saveHolidays");
  },

  async getConfig(): Promise<SystemConfig | null> {
    const res = await safeFetch(`${API_BASE_URL}/config`, { cache: 'no-store' });
    if (!res) return null;
    const serverData = await handleResponse(res, "getConfig");
    return serverData || null;
  },

  async saveConfig(config: SystemConfig): Promise<void> {
    const res = await safeFetch(`${API_BASE_URL}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (res) await handleResponse(res, "saveConfig");
  },

  async getNotifications(): Promise<Notification[]> {
    const res = await safeFetch(`${API_BASE_URL}/notifications`, { cache: 'no-store' });
    if (!res) return [];
    const serverData = await handleResponse(res, "getNotifications");
    if (!serverData || !Array.isArray(serverData)) return [];
    return serverData.map((n: any) => ({
      ...n,
      isRead: n.isRead === true || n.isRead === 1 || n.isRead === "1"
    }));
  },

  async saveNotifications(notifications: Notification[]): Promise<void> {
    const res = await safeFetch(`${API_BASE_URL}/notifications/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications })
    });
    if (res) {
      await handleResponse(res, "saveNotifications");
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
    }
  }
};


import { Attendance } from '../types';
import { API_BASE_URL, handleResponse, cleanDateStr, safeFetch } from './apiClient';

const normalizeAttendance = (a: any): Attendance => {
  const co = a.checkOut;
  const coStr = String(co || '');
  const isTimeValue = coStr.includes(':') && 
                      coStr !== '00:00:00' && 
                      coStr !== '--:--' && 
                      coStr !== 'null' && 
                      coStr !== 'undefined' && 
                      coStr !== '';

  const ci = a.checkIn;
  const ciStr = String(ci || '');
  const isValidCheckIn = ciStr.includes(':') && ciStr !== '00:00:00' && ciStr !== 'null';

  return {
    ...a,
    id: a.id || Math.random().toString(36).substr(2, 9),
    date: cleanDateStr(a.date) || '',
    checkIn: isValidCheckIn ? ciStr : '00:00:00',
    checkOut: isTimeValue ? coStr : undefined,
    latitude: a.latitude ? Number(a.latitude) : undefined,
    longitude: a.longitude ? Number(a.longitude) : undefined,
    accumulatedTime: a.accumulatedTime ? Number(a.accumulatedTime) : 0,
    lastClockIn: a.lastClockIn || (isValidCheckIn ? ciStr : '00:00:00'),
    lateReason: a.lateReason || a.late_reason || undefined
  };
};

export const attendanceService = {
  async getAttendance(): Promise<Attendance[]> {
    const res = await safeFetch(`${API_BASE_URL}/attendance`, { cache: 'no-store' });
    if (!res) return [];
    const serverData = await handleResponse(res, "getAttendance");
    return (serverData || []).map(normalizeAttendance);
  },

  async saveAttendance(data: Attendance[]): Promise<void> {
    const cleaned = data.map(a => ({
      id: a.id,
      userId: a.userId,
      date: cleanDateStr(a.date),
      checkIn: (a.checkIn && a.checkIn !== 'null' && a.checkIn !== '') ? a.checkIn : '00:00:00',
      checkOut: (a.checkOut && String(a.checkOut).includes(':') && a.checkOut !== '00:00:00' && a.checkOut !== 'null') ? a.checkOut : null,
      accumulatedTime: a.accumulatedTime || 0,
      location: a.location || null,
      latitude: a.latitude || null,
      longitude: a.longitude || null,
      lastClockIn: a.lastClockIn || a.checkIn,
      lateReason: a.lateReason || null
    }));
    
    const response = await safeFetch(`${API_BASE_URL}/attendance/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendance: cleaned })
    });
    if (response) await handleResponse(response, "saveAttendance");
  }
};

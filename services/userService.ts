
import { User } from '../types';
import { API_BASE_URL, handleResponse, cleanDateStr, safeFetch } from './apiClient';

export const userService = {
  async getUsers(): Promise<User[]> {
    const res: Response | null = await safeFetch(`${API_BASE_URL}/users`, { cache: 'no-store' });
    if (!res) return [];
    const serverData = await handleResponse(res, "getUsers");
    return serverData || [];
  },

  async saveUsers(users: User[]): Promise<void> {
    const cleaned = users.map(u => ({ 
      ...u, 
      joinDate: cleanDateStr(u.joinDate),
      dob: cleanDateStr(u.dob),
      probationEndDate: cleanDateStr(u.probationEndDate),
    }));
    
    const res: Response | null = await safeFetch(`${API_BASE_URL}/users/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: cleaned })
    });
    if (res) await handleResponse(res, "saveUsers");
  },

  async uploadAvatar(file: File, username: string): Promise<string> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('category', 'userimage');
    formData.append('file', file, file.name);
    
    const res: Response | null = await safeFetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res) throw new Error("Server offline: Avatar upload failed.");
    const data = await handleResponse(res, "uploadAvatar");
    return data.url;
  },

  async uploadDocument(file: File, username: string, docType: string): Promise<string> {
    const formData = new FormData();
    const normalizedUsername = username.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '');
    
    formData.append('username', normalizedUsername);
    formData.append('category', 'company_docs'); 
    formData.append('docType', docType);
    formData.append('file', file, file.name); 
    
    const res: Response | null = await safeFetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res) throw new Error("Server offline: Document upload failed.");
    const data = await handleResponse(res, "uploadDocument");
    return data.url;
  }
};

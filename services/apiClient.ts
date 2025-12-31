
// Determine if we are in production based on the hostname
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// In production, we assume the API is served from the same origin as the frontend
export const API_BASE_URL = isProduction 
  ? `${window.location.origin}/api` 
  : 'http://localhost:5000/api';

export const ASSET_BASE_URL = isProduction 
  ? window.location.origin 
  : 'http://localhost:5000';

/**
 * Sanitized response handler.
 */
export const handleResponse = async (response: Response, context: string) => {
  if (!response.ok) {
    if (!isProduction) {
      const errorDetail = await response.text();
      console.error(`🔴 [DEV DEBUG] ${context}:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorDetail
      });
    }
    throw new Error(`Sync Error [${response.status}] in ${context}`);
  }
  return await response.json();
};

/**
 * A safe fetch wrapper that catches network errors (backend offline) 
 * and returns null instead of throwing unhandled "Failed to fetch".
 */
export const safeFetch = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    console.warn(`🌐 Connectivity Note: Backend at ${url} is unreachable. System is operating in Offline/Cache mode.`);
    return null;
  }
};

export const cleanDateStr = (d: any): string | null => {
  if (!d || d === '' || d === 'null' || d === 'undefined') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return String(d);
  
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d).split(' ')[0] || null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return String(d).split('T')[0] || null;
  }
};

export const resolveAvatarUrl = (avatarPath: string | undefined) => {
  if (!avatarPath) return 'https://i.pravatar.cc/150?u=unknown';
  if (avatarPath.startsWith('http') || avatarPath.startsWith('data:')) return avatarPath;
  return `${ASSET_BASE_URL}${avatarPath.startsWith('/') ? '' : '/'}${avatarPath}`;
};

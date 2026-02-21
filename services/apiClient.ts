
// Base session key constant
const SESSION_KEY = 'nexushr_active_session';

/**
 * Backend URL configuration.
 * For separate hosting (Static Frontend + Web Service Backend):
 * Use VITE_API_URL environment variable.
 */
const BACKEND_URL = 'https://node-mysql-api-lhbg.onrender.com';

export const API_BASE_URL = `${BACKEND_URL}/api`;

// Base URL for resolving assets like uploads
export const ASSET_BASE_URL = BACKEND_URL;

/**
 * Sanitized response handler.
 * Validates Content-Type to prevent SyntaxErrors when parsing HTML as JSON.
 */
export const handleResponse = async (response: Response, context: string): Promise<any> => {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  // Handle unauthorized/expired token
  if (response.status === 401) {
    console.warn(`🔒 Session Expired: ${context} returned 401.`);
    localStorage.removeItem(SESSION_KEY);
    window.location.href = '/login?expired=true';
    throw new Error('SESSION_EXPIRED');
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.group(`🔴 MyHR Server Error [${response.status}]`);
    console.error(`Context: ${context}`);
    console.error(`Endpoint: ${response.url}`);
    
    try {
      if (isJson) {
        const jsonError = JSON.parse(errorBody);
        console.error('Server Message:', jsonError.message || jsonError.error || 'No message provided');
      } else {
        console.error('Non-JSON Error Body received.');
      }
    } catch {
      console.error('Raw Error Body:', errorBody);
    }
    console.groupEnd();
    
    throw new Error(`${context} failed: ${response.status} ${response.statusText}`);
  }

  if (!isJson) {
    const text = await response.text();
    const isHtml = text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html');
    
    if (isHtml) {
      console.warn(`⚠️ MyHR Connectivity Issue: Fetch to ${response.url} returned HTML. This usually means the backend server is unreachable or misconfigured.`);
      throw new Error(`SERVER_OFFLINE: ${context} received HTML instead of JSON.`);
    }
    return text;
  }

  try {
    return await response.json();
  } catch (e) {
    throw new Error(`${context} failed: Response was marked as JSON but could not be parsed.`);
  }
};

/**
 * Helper to retrieve token from current session
 */
const getAuthToken = (): string | null => {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    const user = JSON.parse(session);
    return user.token || null;
  } catch {
    return null;
  }
};

/**
 * A safe fetch wrapper that catches network errors and injects Authorization tokens.
 */
export const safeFetch = async (url: string, options?: RequestInit): Promise<Response | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const token = getAuthToken();
    const headers = new Headers(options?.headers || {});
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    console.error("Fetch failed:", error);
    return null;
  }
};

export const cleanDateStr = (d: any): string | null => {
  if (!d || d === '' || d === 'null' || d === 'undefined') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return String(d);
  
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) {
      const match = String(d).match(/(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : null;
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
};

/**
 * Resolves avatar and document URLs safely.
 */
export const resolveAvatarUrl = (path: string | undefined) => {
  if (!path) return 'https://i.pravatar.cc/150?u=unknown'; // Fallback
  if (path.startsWith('http') || path.startsWith('data:')) return path; // Already a full URL
  
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // If it's a local upload, we prefix it with the Backend URL
  if (cleanPath.startsWith('uploads')) {
    return `${BACKEND_URL}/${cleanPath}`;
  }
  
  return `${ASSET_BASE_URL}/${cleanPath}`;
};


// Determine if we are in production based on the hostname
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

/**
 * For the full-stack app:
 * - In dev (Vite): /api is proxied to localhost:5000
 * - In prod: We use the explicit backend URL provided to ensure cross-origin functionality
 */
const PROD_BACKEND_URL = 'https://node-mysql-api-lhbg.onrender.com';

export const API_BASE_URL = isProduction ? `${PROD_BACKEND_URL}/api` : '/api';

// Base URL for resolving assets like uploads
export const ASSET_BASE_URL = isProduction ? PROD_BACKEND_URL : window.location.origin;

/**
 * Sanitized response handler.
 * Validates Content-Type to prevent SyntaxErrors when parsing HTML as JSON.
 */
export const handleResponse = async (response: Response, context: string): Promise<any> => {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

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
 * A safe fetch wrapper that catches network errors.
 */
export const safeFetch = async (url: string, options?: RequestInit): Promise<Response | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
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
 * Points to the remote backend in production instead of the frontend origin.
 */
export const resolveAvatarUrl = (path: string | undefined) => {
  if (!path) return 'https://i.pravatar.cc/150?u=unknown';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  
  // Clean the path to ensure it's a valid relative path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // In development, Vite proxy handles /uploads locally.
  // In production, we explicitly point to the remote backend.
  return `${ASSET_BASE_URL}/${cleanPath}`;
};

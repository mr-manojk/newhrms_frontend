
// Determine if we are in production based on the hostname
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

/**
 * For a portable full-stack app, we use relative paths.
 * - In dev (Vite): /api is proxied to localhost:5000 via vite.config.ts
 * - In prod (Render): The Express server serves /api directly on the same port.
 */
export const API_BASE_URL = 'https://node-mysql-api-lhbg.onrender.com/api';

// Used for resolving asset paths (avatars, documents)
export const ASSET_BASE_URL = window.location.origin;

/**
 * Sanitized response handler.
 * Validates Content-Type to prevent SyntaxErrors when parsing HTML as JSON.
 */
export const handleResponse = async (response: Response, context: string): Promise<any> => {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    const errorBody = await response.text();
    console.group(`🔴 NexusHR Server Error [${response.status}]`);
    console.error(`Context: ${context}`);
    console.error(`Endpoint: ${response.url}`);
    console.error(`Content-Type: ${contentType}`);
    
    try {
      if (isJson) {
        const jsonError = JSON.parse(errorBody);
        console.error('Server Message:', jsonError.message || jsonError.error || 'No message provided');
        if (jsonError.code) console.error('Error Code:', jsonError.code);
      } else {
        console.error('HTML/Text Error Body:', errorBody.substring(0, 200) + (errorBody.length > 200 ? '...' : ''));
      }
    } catch {
      console.error('Raw Error Body:', errorBody);
    }
    console.groupEnd();
    
    throw new Error(`${context} failed: ${response.status} ${response.statusText}`);
  }

  if (!isJson) {
    const text = await response.text();
    console.warn(`⚠️ Unexpected non-JSON response from ${response.url} (Type: ${contentType})`);
    // If it's HTML, it's likely a 404 or a misrouted request
    if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
      throw new Error(`${context} failed: Received HTML instead of JSON. The server might be misconfigured or the route does not exist.`);
    }
    return text; // Fallback for text/plain
  }

  try {
    return await response.json();
  } catch (e) {
    const raw = await response.text();
    console.error('Failed to parse JSON response:', raw);
    throw new Error(`${context} failed: Response was marked as JSON but could not be parsed.`);
  }
};

/**
 * A safe fetch wrapper that catches network errors (backend offline).
 */
export const safeFetch = async (url: string, options?: RequestInit): Promise<Response | null> => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    console.warn(`🌐 Connectivity Note: Backend at ${url} is unreachable. Check network or server status.`);
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

export const resolveAvatarUrl = (avatarPath: string | undefined) => {
  if (!avatarPath) return 'https://i.pravatar.cc/150?u=unknown';
  if (avatarPath.startsWith('http') || avatarPath.startsWith('data:')) return avatarPath;
  const path = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
  return `${ASSET_BASE_URL}${path}`;
};

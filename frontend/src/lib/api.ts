import { ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

let globalAccessToken: string | null = localStorage.getItem('accessToken');
let globalRefreshToken: string | null = localStorage.getItem('refreshToken');

export function setTokens(access: string | null, refresh: string | null) {
  globalAccessToken = access;
  if (access) {
    localStorage.setItem('accessToken', access);
  } else {
    localStorage.removeItem('accessToken');
  }

  if (refresh !== undefined) {
    globalRefreshToken = refresh;
    if (refresh) {
      localStorage.setItem('refreshToken', refresh);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }
}

export function getAccessToken(): string | null {
  return globalAccessToken;
}

export function getRefreshToken(): string | null {
  return globalRefreshToken;
}

/**
 * Custom Fetch wrapper with automatic JWT Authorization and Refresh token retry logic
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (globalAccessToken) {
    headers.set('Authorization', `Bearer ${globalAccessToken}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const mergedOptions = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, mergedOptions);
    // If unauthorized, attempt to refresh token
    if (response.status === 401 && globalRefreshToken) {
      console.log('Access token expired. Retrying with refresh token...');
      const refreshSuccess = await refreshAccessToken();
      if (refreshSuccess && globalAccessToken) {
        // Retry the original request with the new access token
        headers.set('Authorization', `Bearer ${globalAccessToken}`);
        response = await fetch(url, mergedOptions);
      }
    }

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.message || `Request failed with status ${response.status}`);
    }

    return json;
  } catch (error: any) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!globalRefreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: globalRefreshToken }),
    });

    if (!res.ok) {
      // Clear tokens if refresh fails
      setTokens(null, null);
      window.dispatchEvent(new Event('auth_logout'));
      return false;
    }

    const result = await res.json();
    if (result.success && result.data?.accessToken) {
      setTokens(result.data.accessToken, globalRefreshToken);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to refresh token:', err);
    setTokens(null, null);
    window.dispatchEvent(new Event('auth_logout'));
    return false;
  }
}

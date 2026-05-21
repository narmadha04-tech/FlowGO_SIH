/**
 * Authentication utilities for FlowGO
 * Handles login, registration, verification, and session management
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'flowgo_auth_token';
const USER_KEY = 'flowgo_user';

export interface LoginCredentials {
  authority_id: string;
  password: string;
}

export interface RegisterData {
  authority_id: string;
  name: string;
  email: string;
  password: string;
}

export interface VerifyData {
  authority_id: string;
  verification_code: string;
}

export interface User {
  authority_id: string;
  name: string;
  email?: string;
  role: string;
  is_verified: boolean;
}

/**
 * Store authentication token
 */
function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Get authentication token
 */
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Remove authentication token
 */
function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  try {
    // Basic token validation - check if it's a valid JWT structure
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Check expiration (basic check)
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      removeToken();
      return false;
    }

    return true;
  } catch {
    removeToken();
    return false;
  }
}

/**
 * Login user
 */
export async function login(credentials: LoginCredentials): Promise<User> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Login failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    setToken(data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend API at ${API_BASE_URL}. Please make sure the backend server is running on port 8000.`);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Login failed: Network error or server unavailable');
  }
}

/**
 * Register new user
 */
export async function register(userData: RegisterData): Promise<{ message: string; authority_id: string; verification_code?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Registration failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend API at ${API_BASE_URL}. Please make sure the backend server is running on port 8000.`);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Registration failed: Network error or server unavailable');
  }
}

/**
 * Verify user account
 */
export async function verifyAccount(verifyData: VerifyData): Promise<{ message: string; authority_id: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Verification failed');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Verification failed');
  }
}

/**
 * Resend verification code
 */
export async function resendVerificationCode(authorityId: string): Promise<{ message: string; authority_id: string; verification_code?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification?authority_id=${authorityId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to resend verification code');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to resend verification code');
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        throw new Error('Session expired');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get user');
    }

    const user = await response.json();
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get user');
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  const token = getToken();
  
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  removeToken();
}

/**
 * Get stored user (from localStorage)
 */
export function getStoredUser(): User | null {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}


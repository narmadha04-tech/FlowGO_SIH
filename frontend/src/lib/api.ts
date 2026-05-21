/**
 * API utilities for FlowGO
 * Handles API calls to the backend monitoring server
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_MONITORING_API || 'http://localhost:8000';

/**
 * Fetch monitoring data from the backend
 */
export async function fetchMonitoringData() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch monitoring data: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    // Return default structure on error
    return {
      stats: {
        active_signals: 0,
        incidents: 0,
        green_corridors: 0,
        avg_response_min: 0,
      },
      recent_events: [],
      signals: [],
      traffic: {
        hourlyVolume: [],
        weeklyIncidents: [],
      },
      corridors: {
        active: [],
      },
      cameras: {
        feeds: [],
        online: 0,
        offline: 0,
      },
      training: {
        algo: 'dqn',
        avg_wait_ai: 0,
        avg_wait_baseline: 0,
        improvement_pct: 0,
      },
      updated_at: Date.now() / 1000,
    };
  }
}

/**
 * Generic API fetch with error handling
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `API request failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('API request failed');
  }
}


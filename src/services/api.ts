import { getCSRFHeader, initCSRFForRequest } from '../utils/auth';

const API_BASE = '';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 0,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const statusCode = response.status;

  if (!response.ok) {
    let errorMessage = `HTTP Error ${statusCode}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
    }
    return { success: false, error: errorMessage, statusCode };
  }

  try {
    const data = await response.json();
    return { success: true, data, statusCode };
  } catch {
    return { success: true, statusCode };
  }
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const csrfHeader = getCSRFHeader();
  if (csrfHeader) {
    headers[csrfHeader.name] = csrfHeader.value;
  }
  return headers;
}

export async function apiGet<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    initCSRFForRequest();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse<T>(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error occurred';
    return { success: false, error: message };
  }
}

export async function apiPost<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    initCSRFForRequest();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
      credentials: 'include',
    });
    return handleResponse<T>(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error occurred';
    return { success: false, error: message };
  }
}

export async function apiPut<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    initCSRFForRequest();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
      credentials: 'include',
    });
    return handleResponse<T>(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error occurred';
    return { success: false, error: message };
  }
}

export async function apiDelete<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    initCSRFForRequest();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleResponse<T>(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error occurred';
    return { success: false, error: message };
  }
}

export { ApiError };

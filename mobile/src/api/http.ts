import { type ZodType } from 'zod';

import { getAuthHeaders } from '@/auth/auth';
import { API_BASE_URL } from '@/config/env';

import { AppError, problemToAppError } from './errors';

async function errorFromResponse(response: Response): Promise<AppError> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    // Intentionally ignore response bodies that are not JSON. Never expose raw bodies.
  }
  return problemToAppError(response.status, payload);
}

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

export async function requestJson<T>(
  path: string,
  schema: ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const isMultipart = options.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...authHeaders,
    ...options.headers,
  };
  if (!isMultipart && options.body) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new AppError('Không thể kết nối máy chủ. Kiểm tra mạng và thử lại nhé.', {
      code: 'NETWORK_ERROR',
      retryable: true,
    });
  }
  if (!response.ok) throw await errorFromResponse(response);
  try {
    return schema.parse(await response.json());
  } catch {
    throw new AppError('Máy chủ trả về dữ liệu chưa hợp lệ. Hãy thử lại sau.', {
      code: 'INVALID_RESPONSE',
      retryable: true,
      status: response.status,
    });
  }
}

export async function requestEmpty(path: string, options: RequestOptions): Promise<void> {
  const authHeaders = await getAuthHeaders();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...authHeaders, ...options.headers },
    });
  } catch {
    throw new AppError('Không thể kết nối máy chủ. Kiểm tra mạng và thử lại nhé.', {
      code: 'NETWORK_ERROR',
      retryable: true,
    });
  }
  if (!response.ok) throw await errorFromResponse(response);
}

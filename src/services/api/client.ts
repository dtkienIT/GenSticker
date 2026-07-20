// API Client skeleton reading from environment variable EXPO_PUBLIC_API_URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.gensticker.example.com/v1';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export const apiClient = {
  getBaseUrl(): string {
    return BASE_URL;
  },

  // Skeleton method for future API calls
  async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        return {
          status: response.status,
          error: `HTTP error status ${response.status}`,
        };
      }

      const data = await response.json();
      return { data, status: response.status };
    } catch (err) {
      return {
        status: 500,
        error: err instanceof Error ? err.message : 'Network error',
      };
    }
  },
};

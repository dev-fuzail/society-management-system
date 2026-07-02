import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BASE_URL, EXPO_PUBLIC_API_BASE } from '../constants';
import { ResponseObject } from './types';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const API_BASE = isWeb
  ? BASE_URL
  : EXPO_PUBLIC_API_BASE;

class ApiService {
  private axiosInstance: AxiosInstance;

  private async getStoredToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem('authToken');
    }
    return AsyncStorage.getItem('authToken');
  }

  private normalizeUrl(url: string): string {
    // Keep absolute URLs untouched.
    if (/^https?:\/\//i.test(url)) return url;

    const path = url.startsWith('/') ? url : `/${url}`;
    if (path === '/api' || path.startsWith('/api/')) {
      return path;
    }
    return `/api${path}`;
  }

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE.replace(/\/+$/, ''),
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // this.axiosInstance.interceptors.request.use(async (config) => {
    //   const token = await AsyncStorage.getItem('authToken');
    //   if (token) {
    //     config.headers.Authorization = `Bearer ${token}`;
    //   }
    //   return config;
    // });
    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await this.getStoredToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });
  }

  public async setToken(token: string): Promise<void> {
    if (Platform.OS === "web") {
      // Store token in browser localStorage for web
      localStorage.setItem("authToken", token);
    } else {
      // Store token in AsyncStorage for mobile
      await AsyncStorage.setItem("authToken", token);
    }

    // Update axios default header
    this.axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }


  public async clearToken(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
    } else {
      await AsyncStorage.multiRemove(['authToken', 'userData', 'token']);
    }
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  // public async request<T>(
  //   method: 'get' | 'post' | 'put' | 'delete',
  //   url: string,
  //   data?: any
  // ): Promise<ResponseObject<T>> {
  //   try {
  //     const response: AxiosResponse<ResponseObject<T>> = await this.axiosInstance.request({
  //       method,
  //       url,
  //       data,
  //     });
  //     return response.data;
  //   } catch (error: any) {
  //     console.log('API ERROR:', error?.response?.data || error?.message || error);
  //     throw error.response?.data || {
  //       status: false,
  //       message: 'An unknown error occurred',
  //       result: null,
  //     };
  //   }
  // }
  public async request<T>(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    url: string,
    data?: any,
    config?: any // <-- ✅ allow extra config (headers, etc.)
  ): Promise<ResponseObject<T>> {
    try {
      const normalizedUrl = this.normalizeUrl(url);
      const response: AxiosResponse<ResponseObject<T>> = await this.axiosInstance.request({
        method,
        url: normalizedUrl,
        data,
        ...config, // <-- ✅ spread config so custom headers are used
      });
      return response.data;
    } catch (error: any) {
      const statusCode = error?.response?.status;
      const responseData = error?.response?.data;

      if (statusCode === 401) {
        await this.clearToken();
        throw {
          success: false,
          statusCode,
          isAuthError: true,
          message: 'Your session has expired. Please log in again.',
          result: null,
        };
      }

      if (responseData) {
        throw responseData;
      }

      // No HTTP response was received at all (server unreachable, tunnel down,
      // timeout, or device has no connectivity) — surface which one it was
      // instead of a generic message, so this is actually debuggable.
      const isTimeout = error?.code === 'ECONNABORTED';
      const diagnosticMessage = isTimeout
        ? `Request to ${this.normalizeUrl(url)} timed out after ${this.axiosInstance.defaults.timeout}ms.`
        : `Could not reach ${API_BASE} (${error?.message || error?.code || 'network error'}). Check that the backend and tunnel are running and reachable from this device.`;

      console.log('API ERROR (no response received):', {
        url,
        code: error?.code,
        message: error?.message,
      });

      throw {
        status: false,
        message: diagnosticMessage,
        result: null,
      };
    }
  }

  public async uploadFile<T>(url: string, file: any): Promise<ResponseObject<T>> {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "application/octet-stream",
    } as any);

    return this.request<T>('post', url, formData);
  }
}

export default new ApiService();
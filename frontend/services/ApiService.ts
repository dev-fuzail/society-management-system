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

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: EXPO_PUBLIC_API_BASE,
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
      let token: string | null = null;

      if (Platform.OS === "web") {
        token = localStorage.getItem("authToken");
      } else {
        token = await AsyncStorage.getItem("authToken");
      }

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
    await AsyncStorage.removeItem('authToken');
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
      const response: AxiosResponse<ResponseObject<T>> = await this.axiosInstance.request({
        method,
        url,
        data,
        ...config, // <-- ✅ spread config so custom headers are used
      });
      return response.data;
    } catch (error: any) {
      console.log('API ERROR:', error?.response?.data || error?.message || error);
      throw error.response?.data || {
        status: false,
        message: 'An unknown error occurred',
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
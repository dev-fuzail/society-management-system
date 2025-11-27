import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BASE_URL, EXPO_PUBLIC_API_BASE } from '../constants';
import { ResponseObject } from './types';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const API_BASE = isWeb
  ? 'http://localhost:8082'
  : EXPO_PUBLIC_API_BASE;

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  public async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem('authToken', token);
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  public async clearToken(): Promise<void> {
    await AsyncStorage.removeItem('authToken');
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  public async request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: any
  ): Promise<ResponseObject<T>> {
    try {
      const response: AxiosResponse<ResponseObject<T>> = await this.axiosInstance.request({
        method,
        url,
        data,
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
}

export default new ApiService();
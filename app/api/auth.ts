import axios, { AxiosResponse } from 'axios';

// import { BACKEND_URL } from '@env';

const BACKEND_URL = process.env.BACKEND_URL || 'http://192.168.0.111:8001/api';

const API_URL = `${BACKEND_URL}/auth`;

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const registerUser = (
  name: string,
  email: string,
  password: string
): Promise<AxiosResponse<any>> => {
  return axios.post(`${API_URL}/register`, { name, email, password });
};

export const loginUser = (
  email: string,
  password: string
): Promise<AxiosResponse<LoginResponse>> => {
  return axios.post(`${API_URL}/login`, { email, password });
};

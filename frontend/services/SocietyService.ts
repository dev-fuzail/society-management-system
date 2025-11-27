import apiService from './ApiService';
import { ResponseObject, Society } from './types';

interface SocietyData {
  userId: string,
  name: string,
  address: string,
  city: string,
  contact_email: string,
  total_apartments: number
}

export const apiUpdateSociety = async (data: SocietyData): Promise<ResponseObject<any>> => {
  return await apiService.request<any>("put", `/api/societies/update`, data);
};

export const apiGetUserSocieties = async (userId: string): Promise<ResponseObject<Society[]>> => {
  return await apiService.request<Society[]>("get", `/api/societies/user-society/${userId}`);
}
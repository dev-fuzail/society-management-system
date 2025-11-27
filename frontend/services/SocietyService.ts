import apiService from './ApiService';
import { ResponseObject, Society } from './types';

export const apiUpdateSociety = async ({data}: {data: any}): Promise<ResponseObject<any>> => {
  return await apiService.request<any>("put", `/api/societies/update`, data);
};

export const apiGetUserSocieties = async (userId: string): Promise<ResponseObject<Society[]>> => {
  return await apiService.request<Society[]>("get", `/api/societies/user-society/${userId}`);
}
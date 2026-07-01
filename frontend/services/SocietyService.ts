import apiService from './ApiService';
import { MaintenanceConfig, MaintenanceConfigAudit, ResponseObject, Society } from './types';

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

export const apiGetSocietyUsers = async (societyId: string): Promise<ResponseObject<Society>> => {
    return await apiService.request<Society>("get", `/api/societies/${societyId}/members`);
};

export const apiGetMaintenanceSettings = async (societyId: string): Promise<ResponseObject<MaintenanceConfig>> => {
  return await apiService.request<MaintenanceConfig>("get", `/api/societies/${societyId}/maintenance-settings`);
};

export const apiUpdateMaintenanceSettings = async (
  societyId: string,
  data: { userId: string; maintenance_config: MaintenanceConfig }
): Promise<ResponseObject<{ maintenance_config: MaintenanceConfig; audit: MaintenanceConfigAudit }>> => {
  return await apiService.request("put", `/api/societies/${societyId}/maintenance-settings`, data);
};

export const apiGetMaintenanceAuditHistory = async (
  societyId: string
): Promise<ResponseObject<MaintenanceConfigAudit[]>> => {
  return await apiService.request<MaintenanceConfigAudit[]>("get", `/api/societies/${societyId}/maintenance-settings/history`);
};

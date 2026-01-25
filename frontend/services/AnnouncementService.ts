import ApiService from "./ApiService";
import { Announcement, ResponseObject } from "./types";

// 🟢 Create
export const apiCreateAnnouncement = async (data: {
  society_id: string;
  user_id: string;
  title: string;
  message: string;
}): Promise<ResponseObject<Announcement>> => {
  return await ApiService.request<Announcement>('post', '/api/announcements', data);
};

export const apiGetAnnouncements = async (societyId: string): Promise<ResponseObject<Announcement[]>> => {
  return await ApiService.request<Announcement[]>('get', `/api/announcements/society/${societyId}`);
};

export const apiGetAnnouncementById = async (id: string): Promise<ResponseObject<Announcement>> => {
  return await ApiService.request<Announcement>('get', `/api/announcements/${id}`);
};

export const apiUpdateAnnouncement = async (
  id: string, 
  data: { title?: string; message?: string }
): Promise<ResponseObject<Announcement>> => {
  return await ApiService.request<Announcement>('put', `/api/announcements/${id}`, data);
};

export const apiDeleteAnnouncement = async (id: string): Promise<ResponseObject<null>> => {
  return await ApiService.request<null>('delete', `/api/announcements/${id}`);
};
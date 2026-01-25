import ApiService from "./ApiService";
import { Apartment, ResponseObject } from "./types";

export const apiGetSocietyApartmentsForAdmin = async () => {
  return await ApiService.request<any>('get', "/api/apartments/for-admin");
};

export const apiGetMyApartments = async () => {
  return await ApiService.request<any>('get',"/api/apartments/my-apartments");
};

export const apiCreateApartment = async (data: {
  apartment_name: string;
  floor?: number;
}) => {
  return await ApiService.request('post', "/api/apartments", data);
};

export const apiUpdateApartment = async (
  id: string,
  data: {
    apartment_name: string;
    floor?: number;
  }
) => {
  return await ApiService.request('put', `/api/apartments/${id}`, data);
};

export const apiDeleteApartment = async (id: string) => {
  return await ApiService.request('delete', `/api/apartments/${id}`);
};

export const apiVerifyApartment = async (id: string, status: 'verified' | 'rejected') => {
  return await ApiService.request('patch', `/api/apartments/${id}/verify`, { status });
};

export const apiGetApartmentById = async (id: string): Promise<ResponseObject<Apartment>> => {
  return await ApiService.request<Apartment>('get', `/api/apartments/${id}`); 
};

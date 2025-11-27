import ApiService from "./ApiService";

export const apiGetMyApartments = async () => {
  return await ApiService.request<any>('get',"/apartments/my-apartments");
};

export const apiCreateApartment = async (data: {
  apartment_name: string;
  floor?: number;
}) => {
  return await ApiService.request('post', "/apartments", data);
};

export const apiUpdateApartment = async (
  id: string,
  data: {
    apartment_name: string;
    floor?: number;
  }
) => {
  return await ApiService.request('put', `/apartments/${id}`, data);
};

export const apiDeleteApartment = async (id: string) => {
  return await ApiService.request('delete', `/apartments/${id}`);
};

export const apiVerifyApartment = async (id: string, status: 'verified' | 'rejected') => {
  return await ApiService.request('patch', `/apartments/${id}/verify`, { status });
};

export const apiGetApartmentById = async (id: string) => {
    return await ApiService.request('get', `/apartments/${id}`); 
}

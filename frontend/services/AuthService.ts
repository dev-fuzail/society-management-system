import apiService from './ApiService';
import {
  ForgetPasswordResponse,
  InviteData,
  LoginData,
  RegisterData,
  RegResponse,
  ResponseObject,
  UserDataObject,
} from './types';

export const apiLogin = async (data: LoginData): Promise<ResponseObject<UserDataObject>> => {
  const response = await apiService.request<UserDataObject>('post', '/api/auth/login', data);

  if (response.status && response.result.token) {
    await apiService.setToken(response.result.token);
  }

  return response;
};

export const apiRegister = async (data: RegisterData): Promise<ResponseObject<RegResponse>> => {
  return await apiService.request<RegResponse>('post', '/api/auth/register', data);
};

export const apiVerifyInvite = async (token: string): Promise<ResponseObject<{ invite: InviteData }>> => {
  return await apiService.request<{ invite: InviteData }>('get', `/api/auth/verify-invite?token=${token}`);
};


export const apiGenerateInviteLink = async (): Promise<ResponseObject<{ link: string }>> => {
  return await apiService.request<{ link: string }>('post', '/api/auth/generate-invite');
};

export const apiSendEmailInvite = async (email: string): Promise<ResponseObject<null>> => {
  return await apiService.request<null>('post', '/api/auth/send-email', { email });
};

export const apiRegisterFromInvite = async (data: RegisterData): Promise<ResponseObject<RegResponse>> => {
  return await apiService.request<RegResponse>('post', '/api/auth/register-from-invite', { data });
};

export const apiUpdateProfile = async (data: LoginData): Promise<ResponseObject<UserDataObject>> => {
  return await apiService.request<UserDataObject>('put', '/api/auth/update-profile', { data });
};

export const apiResetPassword = async (email: string, token: string, newPassword: string) => {
  return await apiService.request<null>('post', '/api/auth/reset-password', { email, token, newPassword});
};

export const apiForgetPassword = async (email: string): Promise<ResponseObject<ForgetPasswordResponse>> => {
  return await apiService.request<ForgetPasswordResponse>('post', '/api/auth/forgot-password', { email });
};
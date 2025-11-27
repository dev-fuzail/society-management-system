export interface ResponseObject<T> {
  status: boolean;
  message: string;
  result: T;
}

export interface UserDataObject {
  token: string;
  user: UserData;
}

export interface UserData {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  society_id: number;
}

export interface LoginData {
  email?: string;
  password?: string;
  name?: string;
}

export interface UpdateUser {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'member';
  phone?: string;
  token?: string; // For invite-based registration
  society_id?: number; // For invite-based registration
  society_name?: string; // For new society registration
  society_address?: string;
  society_city?: string;
}

export interface InviteData {
  id: number;
  society_id: number;
  email: string;
  role: 'admin' | 'member';
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
}

export interface RegResponse {
  user: UserData;
  token: string;
}
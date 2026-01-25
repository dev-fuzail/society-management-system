export interface ResponseObject<T> {
  status: boolean;
  success?: boolean;
  message: string;
  result: T;
}

export interface UserDataObject {
  token: string;
  user: UserData;
  require2FA?: boolean;
  userId?: string;
}

export interface UserData {
  id: number;
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  society_id: string;
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
  apartment_name?: string;
  floor?: number;
  block?: string;
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

export interface ForgetPasswordResponse {
  email: string;
  resetUrl: string
}

export interface Society {
  _id: string,
  name: string,
  address: string,
  contact_email?: string | null,
  city: string,
  total_apartments: number,
  members: UserData[],
  admins: UserData[],
}

export interface MessageResponse {
  _id: string;
  roomId: string; 
  senderId: { _id: string; name: string; email: string };
  text?: string;
  attachment?: string | null;
  createdAt: string;
}

export interface RoomResponse {
  _id: string;
  societyId: string;
  name: string;
  members: UserData[];
}

export interface SendMessageData {
  roomId: string;
  senderId: string; 
  text?: string;
  attachment?: string | null;
}

export interface CreateRoomData {
  societyId: string;
  name: string;
  created_by: string;
  welcomeText?: string;
}

// types.ts (Add these)

export type TicketStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Closed';

export interface TicketData {
    subject: string;
    description: string;
    createdBy: string; // User ObjectId
    societyId: string; // Society ObjectId
}

export interface TicketResponse {
    _id: string;
    subject: string;
    description: string;
    status: TicketStatus;
    createdBy: { _id: string; name: string; email: string; phone: string }; // Populated User
    societyId: string;
    assignedTo: { _id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateStatusData {
    status?: TicketStatus;
    assignedTo?: string; // User ObjectId (Staff)
}

export interface Apartment {
  _id: string;
  apartment_name: string;
  floor: number;
  block?: string;
  society_id: string;
  owned_by: { _id: string; name: string; email: string }; 
  status: 'pending' | 'verified' | 'rejected';
  created_at?: string;
}

export interface Announcement {
  _id: string;
  society_id: string;
  user_id: string;
  title: string;
  message: string;
  created_at: string;
  updatedAt: string;
}
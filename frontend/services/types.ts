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
  maintenance_config?: MaintenanceConfig,
}

export interface MaintenanceConfig {
  amount: number;
  currency: string;
  due_day: number;
  grace_period_days: number;
  late_payment_charge: number;
  effective_date?: string;
}

export interface NotificationPreferences {
  announcements: boolean;
  elections: boolean;
  maintenance_reminders: boolean;
  visitor_notifications: boolean;
  payment_notifications: boolean;
  general_society_updates: boolean;
}

export interface NotificationAnalytics {
  total_notifications: number;
  delivered_notifications: number;
  failed_notifications: number;
  read_notifications: number;
  unread_notifications: number;
  type_breakdown: { _id: string; count: number }[];
}

export interface InvoiceItem {
  _id: string;
  society_id: string;
  apartment_id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: 'maintenance' | 'general';
  period_key?: string;
  month?: string;
  due_date?: string;
  payment_link?: string;
  reminder_sent_at?: string;
  status: 'pending' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'unpaid';
  generated_at?: string;
  created_at: string;
}

export interface InvoicePage {
  items: InvoiceItem[];
  page: number;
  limit: number;
  total: number;
}

export interface MaintenanceConfigAudit {
  _id: string;
  society_id: string;
  admin_id: {
    _id: string;
    name: string;
    email: string;
  };
  previous_amount: number;
  updated_amount: number;
  previous_config?: MaintenanceConfig;
  updated_config: MaintenanceConfig;
  changed_at: string;
  created_at: string;
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
  imageUrl?: string;
    createdBy: string; // User ObjectId
    societyId: string; // Society ObjectId
}

export interface TicketResponse {
    _id: string;
    subject: string;
    description: string;
  imageUrl?: string | null;
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
  category?: 'general' | 'important' | 'emergency';
  is_important?: boolean;
  created_at: string;
  updatedAt: string;
}

export interface NotificationItem {
  _id: string;
  user_id: string;
  society_id?: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any> | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationPage {
  items: NotificationItem[];
  page: number;
  limit: number;
  total: number;
}

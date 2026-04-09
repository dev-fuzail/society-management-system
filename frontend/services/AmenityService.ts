import ApiService from './ApiService';
import { ResponseObject } from './types';

export interface Amenity {
  _id: string;
  name: string;
  type: 'PER_USER' | 'FLAT_EVENT';
  base_price: number;
  max_capacity: number;
  society_id: string;
  created_at: string;
}

export interface AmenityBooking {
  _id: string;
  amenity_id: Amenity;
  user_id: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  society_id: string;
  start_time: string;
  end_time: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  calculated_price: number;
  guest_count: number;
  created_at: string;
}

class AmenityService {
  async getAmenities(society_id: string): Promise<ResponseObject<Amenity[]>> {
    return ApiService.request('get', `/amenities?society_id=${society_id}`);
  }

  async createAmenity(data: Partial<Amenity>): Promise<ResponseObject<Amenity>> {
    return ApiService.request('post', '/amenities', data);
  }

  async bookAmenity(data: { amenity_id: string; society_id: string; start_time: string; end_time: string; guest_count: number }): Promise<ResponseObject<AmenityBooking>> {
    return ApiService.request('post', '/amenities/bookings', data);
  }

  async getBookings(society_id?: string): Promise<ResponseObject<AmenityBooking[]>> {
    const url = society_id ? `/amenities/bookings?society_id=${society_id}` : '/amenities/bookings';
    return ApiService.request('get', url);
  }

  async updateBookingStatus(id: string, status: string): Promise<ResponseObject<AmenityBooking>> {
    return ApiService.request('patch', `/amenities/bookings/${id}/status`, { status });
  }
}

export default new AmenityService();

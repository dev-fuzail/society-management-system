import ApiService from './ApiService';
import { ResponseObject } from './types';

export interface ServiceProvider {
  _id: string;
  name: string;
  category: string;
  contact: string;
  society_id: string;
  average_rating: number;
  total_reviews: number;
  created_at: string;
}

export interface ServiceBooking {
  _id: string;
  provider_id: ServiceProvider;
  user_id: string;
  society_id: string;
  date: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}

export interface Review {
  _id: string;
  provider_id: string;
  user_id: {
    _id: string;
    name: string;
    avatar?: string;
  };
  rating: number;
  comment: string;
  created_at: string;
}

class ServiceProviderService {
  async getProviders(society_id: string): Promise<ResponseObject<ServiceProvider[]>> {
    return ApiService.request('get', `/providers?society_id=${society_id}`);
  }

  async addProvider(data: Partial<ServiceProvider>): Promise<ResponseObject<ServiceProvider>> {
    return ApiService.request('post', '/providers', data);
  }

  async bookProvider(data: { provider_id: string; date: string; society_id: string }): Promise<ResponseObject<ServiceBooking>> {
    return ApiService.request('post', '/bookings', data);
  }

  async getUserBookings(): Promise<ResponseObject<ServiceBooking[]>> {
    return ApiService.request('get', '/bookings');
  }

  async updateBookingStatus(id: string, status: string): Promise<ResponseObject<ServiceBooking>> {
    return ApiService.request('patch', `/bookings/${id}/status`, { status });
  }

  async addReview(provider_id: string, data: { rating: number; comment: string }): Promise<ResponseObject<Review>> {
    return ApiService.request('post', `/providers/${provider_id}/reviews`, data);
  }

  async getReviews(provider_id: string): Promise<ResponseObject<Review[]>> {
    return ApiService.request('get', `/providers/${provider_id}/reviews`);
  }
}

export default new ServiceProviderService();

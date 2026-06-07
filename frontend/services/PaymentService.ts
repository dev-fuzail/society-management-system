import apiService from './ApiService';
import { ResponseObject } from './types';

export interface StripePaymentIntentData {
  payment_intent_id: string;
  client_secret: string;
  publishable_key: string;
  amount: number;
  currency: string;
}

export const apiCreateStripePaymentIntent = async (
  invoiceId: string
): Promise<ResponseObject<StripePaymentIntentData>> => {
  return await apiService.request<StripePaymentIntentData>("post", "/api/payments/stripe/payment-intent", {
    invoiceId,
  });
};
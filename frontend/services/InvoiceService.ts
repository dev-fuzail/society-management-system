import apiService from './ApiService';
import { API_BASE } from './ApiService';
import { InvoicePage, ResponseObject } from './types';

export const apiGetInvoices = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  societyId?: string;
}): Promise<ResponseObject<InvoicePage>> => {
  const query = new URLSearchParams();

  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.status) query.append('status', params.status);
  if (params?.type) query.append('type', params.type);
  if (params?.societyId) query.append('societyId', params.societyId);

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiService.request<InvoicePage>('get', `/api/invoices${suffix}`);
};

export const apiGetInvoiceById = async (invoiceId: string): Promise<ResponseObject<any>> => {
  return apiService.request<any>('get', `/api/invoices/${invoiceId}`);
};

export const apiGetPendingInvoiceCount = async (): Promise<ResponseObject<{ count: number }>> => {
  return apiService.request<{ count: number }>('get', '/api/invoices/pending-count');
};

export const apiGetInvoicePdfUrl = (invoiceId: string) => {
  return `${API_BASE.replace(/\/+$/, '')}/api/invoices/${invoiceId}/download`;
};

export interface SocietyPaymentSummary {
  paidCount: number;
  unpaidCount: number;
  totalCollected: number;
  totalDue: number;
  invoices: any[];
}

export const apiGetSocietyPaymentSummary = async (
  societyId: string,
  periodKey?: string
): Promise<ResponseObject<SocietyPaymentSummary>> => {
  const suffix = periodKey ? `?periodKey=${encodeURIComponent(periodKey)}` : '';
  return apiService.request<SocietyPaymentSummary>('get', `/api/invoices/society/${societyId}/summary${suffix}`);
};
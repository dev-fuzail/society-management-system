// services/TicketService.ts

import apiService from "./ApiService";
import { ResponseObject, TicketData, TicketResponse, UpdateStatusData } from "./types";

export const apiGetTickets = (societyId: string): Promise<ResponseObject<TicketResponse[]>> => {
    const url = `/api/tickets?societyId=${societyId}`;
    return apiService.request("get", url);
};

export const apiCreateTicket = (data: TicketData): Promise<ResponseObject<TicketResponse>> =>
    apiService.request("post", '/api/tickets', data);

export const apiUpdateTicketStatus = (id: string, data: UpdateStatusData): Promise<ResponseObject<TicketResponse>> =>
    apiService.request("put", `/api/tickets/${id}/status`, data);

export const apiGetTicketById = (id: string): Promise<ResponseObject<TicketResponse>> => {
    const url = `/api/tickets/${id}`;
    return apiService.request("get", url);
};

import apiService from "./ApiService";
import { NotificationAnalytics, NotificationPage, NotificationPreferences, ResponseObject } from "./types";

export const apiRegisterDeviceToken = async (token: string, platform?: string) => {
  return apiService.request<{ token: string; platform?: string }>(
    "post",
    "/api/notifications/device-token",
    { token, platform }
  );
};

export const apiRemoveDeviceToken = async (token: string) => {
  return apiService.request<{ token: string }>(
    "delete",
    "/api/notifications/device-token",
    { token }
  );
};

export const apiGetNotifications = async (params?: {
  page?: number;
  limit?: number;
  type?: string;
  unreadOnly?: boolean;
}): Promise<ResponseObject<NotificationPage>> => {
  const query = new URLSearchParams();

  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.type) query.append("type", params.type);
  if (params?.unreadOnly) query.append("unreadOnly", "true");

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiService.request<NotificationPage>(
    "get",
    `/api/notifications${suffix}`
  );
};

export const apiMarkNotificationRead = async (id: string) => {
  return apiService.request<any>("patch", `/api/notifications/${id}/read`);
};

export const apiMarkAllNotificationsRead = async () => {
  return apiService.request<any>("patch", "/api/notifications/read-all");
};

export const apiGetNotificationPreferences = async (): Promise<ResponseObject<{ preferences: NotificationPreferences }>> => {
  return apiService.request<{ preferences: NotificationPreferences }>("get", "/api/notifications/preferences");
};

export const apiUpdateNotificationPreferences = async (
  preferences: Partial<NotificationPreferences>
): Promise<ResponseObject<{ preferences: NotificationPreferences }>> => {
  return apiService.request<{ preferences: NotificationPreferences }>("put", "/api/notifications/preferences", {
    preferences,
  });
};

export const apiGetNotificationAnalytics = async (): Promise<ResponseObject<NotificationAnalytics>> => {
  return apiService.request<NotificationAnalytics>("get", "/api/notifications/analytics");
};

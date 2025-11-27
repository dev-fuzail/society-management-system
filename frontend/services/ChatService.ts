import apiService from "./ApiService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

/* ---------------- Upload Attachment ---------------- */
export const apiUploadFile = async (file: any) => {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || "image/jpeg",
  } as any);

  const res = await apiService.request<{ url: string }>(
    "post",
    "/api/chat/upload",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  return res.result.url;
};

/* ---------------- Get messages ---------------- */
export const apiGetMessages = (roomId: string) =>
  apiService.request("get", `/api/chat/messages/${roomId}`);

/* ---------------- Send message ---------------- */
export const apiSendMessage = (data: any) =>
  apiService.request("post", `/api/chat/messages`, data);

/* ---------------- Edit ---------------- */
export const apiEditMessage = (id: string, text: string) =>
  apiService.request("put", `/api/chat/messages/${id}`, { text });

/* ---------------- Delete ---------------- */
export const apiDeleteMessage = (id: string) =>
  apiService.request("delete", `/api/chat/messages/${id}`);

/* ---------------- Get Chat Token ---------------- */
export const apiGetChatToken = async (fallbackUserId: string): Promise<string> => {
  try {
    let user_id = await AsyncStorage.getItem("user_id");
    if (!user_id) user_id = fallbackUserId;

    const response = await apiService.request<{ token: string }>(
      "post",
      "/get-token",
      { user_id }
    );

    return response.result.token;
  } catch (error) {
    console.error("Error fetching chat token:", error);
    throw error;
  }
};

export const apiCreateRoom = (roomId: string, userId: string, societyName: string) =>
  apiService.request("post", "/api/chat/create-room", {
    roomId,
    created_by: userId,
    welcomeText: `You created "${societyName}" group.`,
  });

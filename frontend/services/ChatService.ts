import apiService from "./ApiService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CreateRoomData, MessageResponse, ResponseObject, RoomResponse, SendMessageData, Society } from "./types";
import { EXPO_PUBLIC_API_BASE } from "@/constants";

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

  const baseApiUrl = EXPO_PUBLIC_API_BASE; 
  console.log(res.result)
  const imageUrl = `${baseApiUrl}${res.result.url.startsWith('/') ? '' : '/'}${res.result.url}`;
  console.log("imageeeeeeeeeeeeeeeeeeeeeeeee",imageUrl)
  return imageUrl;
};

export const apiUploadFiles = async (file: any) => {
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

export const apiGetMessages = (roomId: string): Promise<ResponseObject<MessageResponse[]>> =>
  apiService.request("get", `/api/chat/messages/${roomId}`);

export const apiSendMessage = (data: SendMessageData): Promise<ResponseObject<MessageResponse>> =>
  apiService.request("post", `/api/chat/messages`, data);

export const apiEditMessage = (id: string, text: string): Promise<ResponseObject<MessageResponse>> =>
  apiService.request("put", `/api/chat/messages/${id}`, { text });

export const apiDeleteMessage = (id: string): Promise<ResponseObject<any>> => // Assuming delete returns a success object
  apiService.request("delete", `/api/chat/messages/${id}`);

export const apiCreateRoom = (data: CreateRoomData): Promise<ResponseObject<RoomResponse>> =>
  apiService.request("post", `/api/chat/create-room`, data);

export const apiStartTyping = ({roomId, userId, userName}:{roomId:string, userId:string, userName:string}): Promise<ResponseObject<RoomResponse>> =>
  apiService.request("post", `/api/chat/typing/start`, { roomId, userId, userName });

export const apiStopTyping = ({roomId, userId, userName}:{roomId:string, userId:string, userName:string}): Promise<ResponseObject<RoomResponse>> =>
  apiService.request("post", `/api/chat/typing/stop`, { roomId, userId, userName });

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


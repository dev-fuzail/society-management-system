import React, { useState, useEffect } from "react";
import {
    Modal,
    View,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Text,
    StyleSheet,
    Image,
    Pressable,
    Alert,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import uuid from "react-native-uuid";
import { useFocusEffect } from "expo-router";
import { io } from "socket.io-client";
import { Ionicons } from "@expo/vector-icons";

import {
    apiDeleteMessage,
    apiGetMessages,
    apiSendMessage,
    apiUploadFile,
    apiCreateRoom,
    apiEditMessage,
    apiStartTyping,
    apiStopTyping
} from "@/services/ChatService";

import { apiGetUserSocieties } from "@/services/SocietyService";
import { formatTime, getAuthData } from "@/hooks/helperHooks";
import { API_BASE } from "@/services/ApiService";

let typingTimeout: any = null;
let isTypingLocal = false;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CommunityChat = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState("");
    const [roomId, setRoomId] = useState<string | null>(null);
    const [society, setSociety] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    const [socket, setSocket] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editMessageId, setEditMessageId] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const [currentImageUri, setCurrentImageUri] = useState('');

    useEffect(() => {
        const init = async () => {
            const { userData } = await getAuthData();
            if (!userData) return;
            setUser(userData);

            const res = await apiGetUserSocieties(userData.id);
            if (res.result && res.result[0]) {
                const selectedSociety = res.result[0];
                setSociety(selectedSociety);
                const generatedRoomId = selectedSociety._id;
                setRoomId(generatedRoomId);

                try {
                    const roomMessages = await apiGetMessages(generatedRoomId);
                    setMessages(roomMessages.result.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || []);
                } catch {
                    const roomData = {
                        societyId: generatedRoomId,
                        name: selectedSociety?.name,
                        created_by: userData.id,
                    };
                    const createRoomResponse = await apiCreateRoom(roomData);
                    if (createRoomResponse && createRoomResponse.result) {
                        fetchMessages(generatedRoomId);
                    }
                }
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!roomId || !user) return;
        const newSocket = io(API_BASE);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('joinRoom', roomId);
        });

        newSocket.on('userTyping', ({ userId, userName, isTyping }: any) => {
            if (userId === user?.id) return;
            setTypingUsers(prev => {
                const next = { ...prev };
                if (isTyping) next[userId] = userName;
                else delete next[userId];
                return next;
            });
        });

        return () => {
            newSocket.disconnect();
        };
    }, [roomId, user]);

    useFocusEffect(
        React.useCallback(() => {
            return () => {
                if (socket) socket.disconnect();
            };
        }, [socket])
    );

    const sendTypingStatus = async (isStart: boolean) => {
        if (!roomId || !user) return;
        const data = { roomId, userId: user.id, userName: user.name };
        try {
            if (isStart) await apiStartTyping(data);
            else await apiStopTyping(data);
        } catch {}
    };

    const startTypingHandler = () => {
        if (!roomId || !user || isTypingLocal) return;
        isTypingLocal = true;
        sendTypingStatus(true);
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => stopTypingHandler(), 3000);
    };

    const stopTypingHandler = () => {
        if (!roomId || !user || !isTypingLocal) return;
        isTypingLocal = false;
        sendTypingStatus(false);
        if (typingTimeout) clearTimeout(typingTimeout);
    };

    const handleInputChange = (newText: string) => {
        setText(newText);
        if (newText.length > 0) startTypingHandler();
        else stopTypingHandler();
    };

    const fetchMessages = async (rId?: string) => {
        const activeRoom = rId || roomId;
        if (!activeRoom) return;
        try {
            const res = await apiGetMessages(activeRoom);
            setMessages(res.result.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || []);
        } catch {}
    };

    useEffect(() => {
        if (!roomId) return;
        fetchMessages();
        const interval = setInterval(() => fetchMessages(roomId), 3000);
        return () => clearInterval(interval);
    }, [roomId]);

    const sendMessage = async (attachmentUrl?: string) => {
        if (!roomId) return;
        if (text.trim() === "" && !attachmentUrl) return;
        stopTypingHandler();
        try {
            if (isEditing && editMessageId) {
                await apiEditMessage(editMessageId, text.trim());
                setIsEditing(false);
                setEditMessageId(null);
            } else {
                await apiSendMessage({
                    roomId,
                    text: text.trim(),
                    attachment: attachmentUrl || null,
                    senderId: user?.id,
                });
            }
            setText("");
            fetchMessages(roomId);
        } catch {
            Alert.alert("Error", "Failed to send message.");
        }
    };

    const pickAttachment = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
            });
            if (!result.canceled) {
                const asset = result.assets[0];
                const fileData = {
                    uri: asset.uri,
                    name: `${uuid.v4()}.${asset.uri.split('.').pop()}`,
                    mimeType: asset.mimeType || "image/jpeg",
                };
                const uploadedUrl = await apiUploadFile(fileData);
                if (uploadedUrl) sendMessage(uploadedUrl);
            }
        } catch {
            Alert.alert("Error", "Failed to upload.");
        }
    };

    const handleAttachmentPress = (uri: string) => {
        setCurrentImageUri(uri);
        setIsImageViewerVisible(true);
    };

    const handleEditAction = () => {
        if (!selectedMessage) return;
        setText(selectedMessage.text);
        setIsEditing(true);
        setEditMessageId(selectedMessage._id);
        setIsMenuVisible(false);
        setSelectedMessage(null);
    };

    const handleDelete = async () => {
        if (!selectedMessage) return;
        Alert.alert("Delete Message", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await apiDeleteMessage(selectedMessage._id);
                        setMessages((prev) => prev.filter((msg) => msg._id !== selectedMessage._id));
                        setIsMenuVisible(false);
                        setSelectedMessage(null);
                    } catch {
                        Alert.alert("Error", "Failed to delete.");
                    }
                },
            },
        ]);
    };

    const renderItem = ({ item }: any) => {
        const isCurrentUser = item.senderId?._id === user?.id;
        const sender = item.senderId;
        const messageTime = formatTime(item?.createdAt);
        const avatarSource = sender?.avatar ? { uri: sender.avatar } : require("@/assets/images/avatar-placeholder.png");

        return (
            <View style={[styles.messageContainer, isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer]}>
                {!isCurrentUser && <Image source={avatarSource} style={styles.avatar} />}
                <View style={{ maxWidth: "80%" }}>
                    {!isCurrentUser && <Text style={styles.senderName}>{sender?.name || "Unknown"}</Text>}
                    <Pressable onLongPress={() => { if (isCurrentUser || user?.role === 'admin') { setSelectedMessage(item); setIsMenuVisible(true); } }}>
                        {item.attachment && (
                            <View style={styles.attachmentWrapper}>
                                <Pressable onPress={() => handleAttachmentPress(item.attachment)}>
                                    <Image source={{ uri: item.attachment }} style={styles.attachmentImage} />
                                </Pressable>
                                <View style={styles.imageTimestampContainer}>
                                    <Text style={styles.imageTimestampText}>{messageTime}</Text>
                                </View>
                            </View>
                        )}
                        {item.text ? (
                            <View style={[styles.messageBubble, isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble]}>
                                <Text style={isCurrentUser ? styles.currentUserText : styles.otherUserText}>{item.text}</Text>
                                <Text style={[styles.timestamp, isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp]}>{messageTime}</Text>
                            </View>
                        ) : null}
                    </Pressable>
                </View>
            </View>
        );
    };

    const typingUsersArray = Object.values(typingUsers);
    const typingIndicatorText = typingUsersArray.length > 0 ? `${typingUsersArray.join(', ')} typing...` : null;

    return (
        <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={100}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{society?.name || "Community Chat"}</Text>
                <Text style={styles.headerSubtitle}>Official Society Group</Text>
            </View>
            {roomId ? (
                <FlatList
                    data={messages}
                    keyExtractor={(item) => String(item._id)}
                    style={{ flex: 1 }}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
                    inverted
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text style={styles.loadingText}>Loading conversation...</Text>
                </View>
            )}
            <View style={styles.typingContainer}>
                {typingIndicatorText ? (
                    <View style={styles.typingIndicatorBubble}>
                        <Text style={styles.typingIndicatorText}>{typingIndicatorText}</Text>
                    </View>
                ) : null}
            </View>
            <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachmentBtn} onPress={pickAttachment}>
                        <Ionicons name="add" size={24} color="#64748b" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={text}
                        onChangeText={handleInputChange}
                        placeholder={isEditing ? "Edit message..." : "Message society..."}
                        placeholderTextColor="#94a3b8"
                        multiline
                    />
                    <TouchableOpacity style={[styles.sendBtn, (!text.trim() && !isEditing) && styles.sendBtnDisabled]} onPress={() => sendMessage()}>
                        <Ionicons name={isEditing ? "checkmark" : "arrow-up"} size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
            <Modal visible={isMenuVisible} transparent animationType="fade" onRequestClose={() => setIsMenuVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setIsMenuVisible(false)}>
                    <View style={styles.menuContainer}>
                        {selectedMessage?.senderId?._id === user?.id && (
                            <TouchableOpacity style={styles.menuItem} onPress={handleEditAction}>
                                <Ionicons name="pencil-outline" size={18} color="#1e293b" />
                                <Text style={styles.menuText}>Edit Message</Text>
                            </TouchableOpacity>
                        )}
                        {(user?.role === 'admin' || selectedMessage?.senderId?._id === user?.id) && (
                            <>
                                <View style={styles.separator} />
                                <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                    <Text style={[styles.menuText, { color: "#ef4444" }]}>Delete Message</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </Pressable>
            </Modal>
            <Modal visible={isImageViewerVisible} transparent onRequestClose={() => setIsImageViewerVisible(false)}>
                <View style={styles.imageViewerBackground}>
                    <Pressable style={styles.imageViewerCloseArea} onPress={() => setIsImageViewerVisible(false)} />
                    <Image source={{ uri: currentImageUri }} style={styles.fullScreenImage} resizeMode="contain" />
                    <TouchableOpacity style={styles.closeButton} onPress={() => setIsImageViewerVisible(false)}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    keyboardAvoidingView: { flex: 1, backgroundColor: "#f8fafc" },
    header: { paddingTop: 12, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    headerSubtitle: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748b', fontWeight: '500' },
    messageContainer: { flexDirection: "row", alignItems: "flex-end", marginVertical: 6 },
    currentUserMessageContainer: { justifyContent: "flex-end" },
    otherUserMessageContainer: { justifyContent: "flex-start" },
    avatar: { width: 32, height: 32, borderRadius: 12, marginRight: 10, backgroundColor: '#eef2ff' },
    senderName: { fontSize: 11, fontWeight: '700', color: '#4f46e5', marginLeft: 4, marginBottom: 4, textTransform: 'uppercase' },
    messageBubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, maxWidth: screenWidth * 0.75, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 5, elevation: 1 },
    currentUserBubble: { backgroundColor: "#4f46e5", borderBottomRightRadius: 4 },
    otherUserBubble: { backgroundColor: "#fff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#f1f5f9' },
    currentUserText: { color: "#fff", fontSize: 15, lineHeight: 20 },
    otherUserText: { color: "#1e293b", fontSize: 15, lineHeight: 20 },
    timestamp: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    currentUserTimestamp: { color: 'rgba(255, 255, 255, 0.7)' },
    otherUserTimestamp: { color: '#94a3b8' },
    attachmentWrapper: { borderRadius: 16, overflow: 'hidden', marginBottom: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9' },
    attachmentImage: { width: 220, height: 220, resizeMode: 'cover' },
    imageTimestampContainer: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    imageTimestampText: { fontSize: 10, color: '#fff', fontWeight: '600' },
    typingContainer: { height: 30, paddingHorizontal: 20, justifyContent: 'center' },
    typingIndicatorBubble: { backgroundColor: 'rgba(79, 70, 229, 0.08)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    typingIndicatorText: { color: '#4f46e5', fontSize: 12, fontWeight: '600', fontStyle: 'italic' },
    inputWrapper: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16, paddingTop: 8, backgroundColor: '#fff' },
    inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 24, paddingHorizontal: 8, paddingVertical: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    input: { flex: 1, fontSize: 15, maxHeight: 100, paddingHorizontal: 12, paddingVertical: 8, color: '#1e293b' },
    attachmentBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#4f46e5", justifyContent: "center", alignItems: "center", shadowColor: '#4f46e5', shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 },
    sendBtnDisabled: { backgroundColor: '#cbd5e1', shadowOpacity: 0, elevation: 0 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "center", alignItems: "center" },
    menuContainer: { width: 240, backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, gap: 12 },
    menuText: { fontSize: 15, color: "#1e293b", fontWeight: '600' },
    separator: { height: 1, backgroundColor: "#f1f5f9" },
    imageViewerBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    imageViewerCloseArea: { ...StyleSheet.absoluteFillObject },
    fullScreenImage: { width: screenWidth, height: screenHeight * 0.8 },
    closeButton: { position: 'absolute', top: 60, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
});

export default CommunityChat;
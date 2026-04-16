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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import uuid from "react-native-uuid";
import { useFocusEffect } from "expo-router";
import { io } from "socket.io-client";
import * as Linking from 'expo-linking';

// Ensure these APIs are set up to return { success: bool, result: T }
import {
    apiDeleteMessage,
    apiGetMessages,
    apiSendMessage,
    apiUploadFile,
    apiCreateRoom,
    apiEditMessage,
    // Assuming these two APIs exist and call the REST endpoints:
    apiStartTyping,
    apiStopTyping
} from "@/services/ChatService";

import { apiGetUserSocieties } from "@/services/SocietyService";
import { formatTime, getAuthData } from "@/hooks/helperHooks";
import { API_BASE } from "@/services/ApiService";

// Debounce Utility for Typing
let typingTimeout: number | null = null;
let isTyping = false;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CommunityChat = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState("");
    const [roomId, setRoomId] = useState<string | null>(null);
    const [society, setSociety] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    // State for socket, typing, editing, and image viewer
    const [socket, setSocket] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editMessageId, setEditMessageId] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const [currentImageUri, setCurrentImageUri] = useState('');

    /* ---------------- Load user + society ---------------- */
    useEffect(() => {
        const init = async () => {
            const { userData } = await getAuthData();
            if (!userData) return;

            setUser(userData);

            const res = await apiGetUserSocieties(userData.id);
            // 🛠️ FIX 1: Use .result after apiGetUserSocieties call
            if (res.result) {
                const selectedSociety = res.result;
                setSociety(selectedSociety[0]);

                const generatedRoomId = selectedSociety[0]._id;
                setRoomId(generatedRoomId);

                // Try to fetch messages, if fail, create room
                try {
                    const roomMessages = await apiGetMessages(generatedRoomId);
                    // 🛠️ FIX 2: Use .result after apiGetMessages call
                    setMessages(roomMessages.result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || []);
                } catch (err) {
                    const roomData = {
                        societyId: generatedRoomId,
                        name: selectedSociety[0]?.name,
                        created_by: userData.id,
                    };
                    const createRoomResponse = await apiCreateRoom(roomData);
                    // 🛠️ FIX 3: Use .result after apiCreateRoom call
                    if (createRoomResponse && createRoomResponse.result) {
                        fetchMessages(generatedRoomId);
                    }
                }
            }
        };

        init();
    }, []);

    /* ---------------- Socket Connection & Typing Setup ---------------- */
    useEffect(() => {
        if (!roomId || !user) return;

        const newSocket = io(API_BASE);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('joinRoom', roomId);
        });

        newSocket.on('userTyping', ({ userId, userName, isTyping }) => {
            if (userId === user?.id) return;

            setTypingUsers(prev => {
                const next = { ...prev };
                if (isTyping) {
                    next[userId] = userName;
                } else {
                    delete next[userId];
                }
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
                if (socket) {
                    socket.disconnect();
                }
            };
        }, [socket])
    );

    /* ---------------- Typing Event Handlers (API based) ---------------- */
    const sendTypingStatus = async (isStart: boolean) => {
        if (!roomId || !user) return;

        const data = { roomId, userId: user.id, userName: user.name };

        // ⚠️ Placeholder: Assuming apiStartTyping/apiStopTyping exist and call the REST backend
        try {
            // 🛠️ Placeholder: Uncomment and implement the actual service call here
            if (isStart) { await apiStartTyping(data); }
            else { await apiStopTyping(data); }
        } catch (e) {
            console.error("Failed to send typing status:", e);
        }
    };

    const startTypingHandler = () => {
        if (!roomId || !user || isTyping) return;
        isTyping = true;
        sendTypingStatus(true);

        if (typingTimeout) clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
            stopTypingHandler();
        }, 3000);
    };

    const stopTypingHandler = () => {
        if (!roomId || !user || !isTyping) return;
        isTyping = false;
        sendTypingStatus(false);
        if (typingTimeout) clearTimeout(typingTimeout);
    };

    const handleInputChange = (newText: string) => {
        setText(newText);

        if (newText.length > 0) {
            startTypingHandler();
        } else {
            stopTypingHandler();
        }
    };

    /* ---------------- Get messages ---------------- */
    const fetchMessages = async (rId?: string) => {
        if (!rId && !roomId) return;

        const activeRoom = rId || roomId;

        try {
            const res = await apiGetMessages(activeRoom!);
            // 🛠️ FIX 4: Use .result after apiGetMessages call
            setMessages(res.result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || []);
        } catch {
            Alert.alert("Error", "Failed to load messages.");
        }
    };

    useEffect(() => {
        if (!roomId) return;

        fetchMessages();

        const interval = setInterval(() => fetchMessages(roomId), 3000);
        return () => clearInterval(interval);
    }, [roomId]);

    /* ---------------- Send / Edit Message ---------------- */
    const sendMessage = async (attachmentUrl?: string) => {
        if (!roomId) return;
        if (text.trim() === "" && !attachmentUrl) return;

        stopTypingHandler();

        try {
            if (isEditing && editMessageId) {
                // 🛠️ FIX 5: Use .result after apiEditMessage call
                await apiEditMessage(editMessageId, text.trim());
                setIsEditing(false);
                setEditMessageId(null);
            } else {
                // 🛠️ FIX 6: Use .result after apiSendMessage call
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
            Alert.alert("Error", `Failed to ${isEditing ? 'edit' : 'send'} message.`);
        }
    };

    /* ---------------- Send Attachment ---------------- */
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

                const uploadedUrlResponse = await apiUploadFile(fileData);
                // 🛠️ FIX 7: Use .result after apiUploadFile call
                const uploadedUrl = uploadedUrlResponse;

                if (uploadedUrl) sendMessage(uploadedUrl);
            }
        } catch (e) {
            Alert.alert("Error", "Failed to upload attachment.");
        }
    };

    /* ---------------- Image Viewer Action ---------------- */
    const handleAttachmentPress = (uri: string) => {
        setCurrentImageUri(uri);
        setIsImageViewerVisible(true);
    };

    /* ---------------- Edit Action Menu ---------------- */
    const handleEditAction = () => {
        if (!selectedMessage) return;

        setText(selectedMessage.text);
        setIsEditing(true);
        setEditMessageId(selectedMessage._id);

        setIsMenuVisible(false);
        setSelectedMessage(null);
    };

    /* ---------------- Delete Message ---------------- */
    const handleDelete = async () => {
        if (!selectedMessage) return;

        Alert.alert(
            "Delete Message",
            "Are you sure you want to delete this message?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // 🛠️ FIX 8: Use .result after apiDeleteMessage call
                            await apiDeleteMessage(selectedMessage._id);
                            setMessages((prev) =>
                                prev.filter((msg) => msg._id !== selectedMessage._id)
                            );
                            setIsMenuVisible(false);
                            setSelectedMessage(null);
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete message.");
                        }
                    },
                },
            ]
        );
    };

    /* ---------------- Render Message ---------------- */
    const renderItem = ({ item }: any) => {
        const isCurrentUser = item.senderId?._id === user?.id;
        const sender = item.senderId;
        const messageTime = formatTime(item?.createdAt);

        const avatarSource = sender?.avatar
            ? { uri: sender.avatar }
            : require("@/assets/images/avatar-placeholder.png");

        return (
            <View
                style={[
                    styles.messageContainer,
                    isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer,
                ]}
            >
                {!isCurrentUser && (
                    <Image source={avatarSource} style={styles.avatar} />
                )}

                <View style={{ maxWidth: "80%" }}>
                    {!isCurrentUser && (
                        <Text style={styles.senderName}>{sender?.name || "Unknown User"}</Text>
                    )}
                    <Pressable
                        onLongPress={() => {
                            if (isCurrentUser || user?.role === 'admin') {
                                setSelectedMessage(item);
                                setIsMenuVisible(true);
                            }
                        }}
                    >
                        {/* 🛠️ Image Attachment Display with Time */}
                        {item.attachment && (
                            <View style={styles.attachmentWrapper}>
                                <Pressable onPress={() => handleAttachmentPress(item.attachment)}>
                                    <Image
                                        source={{ uri: item.attachment }}
                                        style={styles.attachmentImage}
                                    />
                                </Pressable>
                                <View style={styles.imageTimestampContainer}>
                                    <Text style={styles.imageTimestampText}>
                                        {messageTime}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {item.text ? (
                            <View
                                style={[
                                    styles.messageBubble,
                                    isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
                                ]}
                            >
                                <Text style={isCurrentUser ? styles.currentUserText : styles.otherUserText}>
                                    {item.text}
                                </Text>
                                <Text style={styles.timestamp}>
                                    {messageTime}
                                </Text>
                            </View>
                        ) : null}
                    </Pressable>
                </View>
            </View>
        );
    };

    const typingUsersArray = Object.values(typingUsers);
    const typingIndicatorText = typingUsersArray.length > 0
        ? `${typingUsersArray.join(', ')} ${typingUsersArray.length > 1 ? 'are' : 'is'} typing...`
        : null;

    return (
        <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={100}
        >
            {roomId ? (
                <FlatList
                    data={messages}
                    keyExtractor={(item) => String(item._id)}
                    style={{ flex: 1, paddingHorizontal: 10 }}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingVertical: 10 }}
                    inverted
                />
            ) : (
                <Text style={{ textAlign: "center", marginTop: 50 }}>
                    Loading chat...
                </Text>
            )}

            {/* Typing Indicator */}
            {typingIndicatorText && (
                <View style={styles.typingIndicatorContainer}>
                    <Text style={styles.typingIndicatorText}>{typingIndicatorText}</Text>
                </View>
            )}

            {/* Input */}
            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.attachmentBtn} onPress={pickAttachment}>
                    <Text style={{ fontSize: 24 }}>📎</Text>
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={handleInputChange}
                    placeholder={isEditing ? "Editing message..." : "Type a message..."}
                    multiline
                />

                <TouchableOpacity
                    style={styles.sendBtnWrapper}
                    onPress={() => sendMessage()}
                >
                    <Text style={styles.sendBtnText}>{isEditing ? "Save" : "Send"}</Text>
                </TouchableOpacity>
            </View>

            {/* Message Action Menu Modal (remains the same) */}
            <Modal
                visible={isMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setIsMenuVisible(false)}
                >
                    <View style={styles.menuContainer}>
                        {selectedMessage?.senderId?._id === user?.id && (
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={handleEditAction}
                            >
                                <Text style={styles.menuText}>Edit</Text>
                            </TouchableOpacity>
                        )}

                        {(user?.role === 'admin' || selectedMessage?.senderId?._id === user?.id) && (
                            <>
                                <View style={styles.separator} />
                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={handleDelete}
                                >
                                    <Text style={[styles.menuText, { color: "red" }]}>
                                        Delete
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </Pressable>
            </Modal>

            {/* 🛠️ Image Viewer Modal */}
            <Modal
                visible={isImageViewerVisible}
                transparent={true}
                onRequestClose={() => setIsImageViewerVisible(false)}
            >
                <View style={styles.imageViewerBackground}>
                    <Image
                        source={{ uri: currentImageUri }}
                        style={styles.fullScreenImage}
                        resizeMode="contain"
                    />
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setIsImageViewerVisible(false)}
                    >
                        <Text style={styles.closeButtonText}>X</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
        backgroundColor: "#E5DDD5",
    },
    messageContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginVertical: 5,
        paddingHorizontal: 10,
    },
    currentUserMessageContainer: {
        justifyContent: "flex-end",
    },
    otherUserMessageContainer: {
        justifyContent: "flex-start",
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
    },
    senderName: {
        fontSize: 12,
        color: "#1E88E5",
        marginLeft: 10,
        marginBottom: 2,
    },
    messageBubble: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 15,
        maxWidth: 300,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    currentUserBubble: {
        backgroundColor: "#128C7E",
        borderBottomRightRadius: 2,
    },
    otherUserBubble: {
        backgroundColor: "#fff",
        borderBottomLeftRadius: 2,
    },
    currentUserText: {
        color: "#fff",
        fontSize: 15,
        flexShrink: 1,
    },
    otherUserText: {
        color: "#333",
        fontSize: 15,
    },
    // 🛠️ Message Bubble Timestamp
    timestamp: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.7)',
        marginLeft: 10,
    },
    // 🛠️ Image Wrapper and Time Overlay Styles
    attachmentWrapper: {
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 5,
    },
    attachmentImage: {
        width: 200,
        height: 200,
        borderRadius: 10,
        resizeMode: 'cover',
    },
    imageTimestampContainer: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    imageTimestampText: {
        fontSize: 10,
        color: '#fff',
    },
    inputContainer: {
        flexDirection: "row",
        paddingVertical: 5,
        paddingHorizontal: 8,
        alignItems: "flex-end",
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    input: {
        flex: 1,
        backgroundColor: "#f9f9f9",
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 15,
        maxHeight: 100,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    attachmentBtn: {
        paddingHorizontal: 5,
        paddingVertical: 10,
    },
    sendBtnWrapper: {
        backgroundColor: "#075E54",
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginLeft: 5,
        justifyContent: "center",
        alignItems: "center",
    },
    sendBtnText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 15,
    },
    typingIndicatorContainer: {
        paddingHorizontal: 20,
        paddingVertical: 5,
        // backgroundColor: '#fff',
    },
    typingIndicatorText: {
        color: '#075E54',
        fontStyle: 'italic',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    menuContainer: {
        width: 220,
        backgroundColor: "#fff",
        borderRadius: 10,
        overflow: "hidden",
    },
    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    menuText: {
        fontSize: 16,
        color: "#333",
    },
    separator: {
        height: 1,
        backgroundColor: "#eee",
    },
    // 🛠️ Image Viewer Styles
    imageViewerBackground: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: screenWidth,
        height: screenHeight,
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 20,
        padding: 8,
        zIndex: 10,
    },
    closeButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default CommunityChat;
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import uuid from "react-native-uuid";

import {
    apiDeleteMessage,
    apiGetMessages,
    apiSendMessage,
    apiUploadFile,
    apiCreateRoom,
} from "@/services/ChatService";

import { apiGetUserSocieties } from "@/services/SocietyService";
import { getAuthData } from "@/hooks/helperHooks";

const CommunityChat = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState("");
    const [roomId, setRoomId] = useState<string | null>(null);
    const [society, setSociety] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    /* ---------------- Load user + society ---------------- */
    useEffect(() => {
        const init = async () => {
            const { userData } = await getAuthData();
            if (!userData) return;

            setUser(userData);
            console.log("Loaded user data:", userData);

            const res = await apiGetUserSocieties(userData.id);
            if (res.result) {
                const selectedSociety = res?.result;
                setSociety(selectedSociety[0]);

                const generatedRoomId = selectedSociety[0]._id;
                setRoomId(generatedRoomId);

                try {
                    const roomMessages = await apiGetMessages(generatedRoomId);
                    setMessages(roomMessages.result || []);
                } catch (err) {
                    const roomData = {
                        societyId: generatedRoomId,
                        name: selectedSociety[0]?.name,
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

    /* ---------------- Get messages ---------------- */
    const fetchMessages = async (rId?: string) => {
        if (!rId && !roomId) return;

        const activeRoom = rId || roomId;

        try {
            const res = await apiGetMessages(activeRoom!);
            setMessages(res.result || []);
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

    /* ---------------- Send Message ---------------- */
    const sendMessage = async (attachmentUrl?: string) => {
        if (!roomId) return;

        if (text.trim() === "" && !attachmentUrl) return;

        try {
            console.log("Sending message:", text.trim(), roomId, user)
            await apiSendMessage({
                roomId,
                text: text.trim(),
                attachment: attachmentUrl || null,
                senderId: user?.id,
            });

            setText("");
            fetchMessages(roomId);
        } catch {
            Alert.alert("Error", "Failed to send message.");
        }
    };

    /* ---------------- Send Attachment ---------------- */
    const pickAttachment = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
            });

            if (!result.canceled) {
                const asset = result.assets[0];

                const fileData = {
                    uri: asset.uri,
                    name: `${uuid.v4()}.jpg`,
                    mimeType: asset.mimeType || "image/jpeg",
                };

                const uploadedUrl = await apiUploadFile(fileData);
                if (uploadedUrl) sendMessage(uploadedUrl);
            }
        } catch {
            Alert.alert("Error", "Failed to upload attachment.");
        }
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
        const isCurrentUser = item.senderId?._id === user?.id; // Check if the message is from the logged-in user
        const sender = item.senderId; // The user object who sent the message
    
        // Fallback avatar if none is provided
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
                            setSelectedMessage(item);
                            setIsMenuVisible(true);
                        }}
                    >
                        {item.attachment && (
                            <Image
                                source={{ uri: item.attachment }}
                                style={styles.attachmentImage}
                            />
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
                            </View>
                        ) : null}
                    </Pressable>
                </View>
            </View>
        );
    };

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

            {/* Input */}
            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.attachmentBtn} onPress={pickAttachment}>
                    <Text style={{ fontSize: 24 }}>📎</Text>
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder="Type a message..."
                    multiline
                />

                <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}>
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>Send</Text>
                </TouchableOpacity>
            </View>

            {/* Message Action Menu Modal */}
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
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => Alert.alert("Edit", "Edit functionality coming soon!")}
                        >
                            <Text style={styles.menuText}>Edit</Text>
                        </TouchableOpacity>

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
        </KeyboardAvoidingView>
    );
};

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
        backgroundColor: "#fff", // A clean white background
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
        width: 35,
        height: 35,
        borderRadius: 17.5,
        marginRight: 10,
    },
    senderName: {
        fontSize: 12,
        color: "#888",
        marginLeft: 12,
        marginBottom: 2,
    },
    messageBubble: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 20,
    },
    currentUserBubble: {
        backgroundColor: "#4B7BEC", // A nice blue for the current user
        borderTopRightRadius: 5,
    },
    otherUserBubble: {
        backgroundColor: "#f0f0f0", // A light grey for others
        borderTopLeftRadius: 5,
    },
    currentUserText: {
        color: "#fff",
        fontSize: 15,
    },
    otherUserText: {
        color: "#000",
        fontSize: 15,
    },
    attachmentImage: {
        width: 200,
        height: 200,
        borderRadius: 15,
        marginBottom: 5,
    },
    inputContainer: {
        flexDirection: "row",
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: "flex-end",
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    input: {
        flex: 1,
        backgroundColor: "#f0f0f0",
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 10,
        fontSize: 15,
        maxHeight: 100,
        marginHorizontal: 10,
    },
    attachmentBtn: { padding: 5 },
    sendBtn: {
        padding: 5,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    menuContainer: {
        width: 250,
        backgroundColor: "#fff",
        borderRadius: 10,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    menuItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        alignItems: "center",
    },
    menuText: {
        fontSize: 18,
        color: "#333",
    },
    separator: {
        height: 1,
        backgroundColor: "#eee",
        width: "100%",
    },
});

export default CommunityChat;

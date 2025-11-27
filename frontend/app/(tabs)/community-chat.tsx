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

            const res = await apiGetUserSocieties(userData._id);
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
        const isCurrentUser = item.senderId?._id === user?.id;
        const canDelete = user?.role === 'admin' || isCurrentUser;

        return (
            <View
                style={[
                    styles.messageContainer,
                    isCurrentUser ? styles.messageRight : styles.messageLeft,
                ]}
            >
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
                                isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
                            ]}
                        >
                            <Text style={isCurrentUser ? styles.textRight : styles.textLeft}>
                                {item.text}
                            </Text>
                        </View>
                    ) : null}
                </Pressable>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: "#ece5dd" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={100}
        >
            {roomId ? (
                <FlatList
                    data={messages}
                    keyExtractor={(item) => String(item._id)}
                    style={{ flex: 1, paddingHorizontal: 10 }}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 10 }}
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
    messageContainer: {
        marginVertical: 5,
        alignItems: "flex-end",
    },
    messageLeft: { justifyContent: "flex-start" },
    messageRight: { justifyContent: "flex-end" },
    messageBubble: { padding: 10, borderRadius: 15, maxWidth: "70%" },
    bubbleLeft: { backgroundColor: "#fff", borderTopLeftRadius: 0 },
    bubbleRight: { backgroundColor: "#dcf8c6", borderTopRightRadius: 0 },
    textLeft: { color: "#000" },
    textRight: { color: "#000" },
    attachmentImage: {
        width: 150,
        height: 150,
        borderRadius: 8,
        marginBottom: 5,
    },
    inputContainer: {
        flexDirection: "row",
        padding: 10,
        alignItems: "flex-end",
        backgroundColor: "#f0f0f0",
    },
    input: {
        flex: 1,
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: "#fff",
        maxHeight: 100,
    },
    attachmentBtn: { paddingHorizontal: 8 },
    sendBtn: {
        backgroundColor: "#075E54",
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginLeft: 5,
        justifyContent: "center",
        alignItems: "center",
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

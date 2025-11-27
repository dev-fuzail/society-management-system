import React, { useState, useEffect } from "react";
import {
    View,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Text,
    StyleSheet,
    Image,
    Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import uuid from "react-native-uuid";

import {
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

    /* ---------------- Load user + society ---------------- */
    useEffect(() => {
        const init = async () => {
            const { userData } = await getAuthData();
            if (!userData) return;

            setUser(userData);

            const res = await apiGetUserSocieties(userData.id);
            console.log("User societies response:", res);
            if (res.result) {
                // Take the first society (or allow selection)
                const selectedSociety = res?.result;
                setSociety(selectedSociety[0]);

                const generatedRoomId = `society-${selectedSociety[0]._id}`;
                setRoomId(generatedRoomId);
                console.log("Generated Room ID:", generatedRoomId);

                // Check if room exists
                try {
                    const roomMessages = await apiGetMessages(generatedRoomId);

                    // If room is empty, create welcome message
                    if (!roomMessages.result || roomMessages.result.length === 0) {
                        await apiCreateRoom(
                            generatedRoomId,
                            userData.id,
                            selectedSociety.name
                        );
                    }

                    fetchMessages(generatedRoomId);
                } catch (err) {
                    // room does NOT exist → create one
                    await apiCreateRoom(
                        generatedRoomId,
                        userData.id,
                        selectedSociety.name
                    );
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
                user_id: user?.id,
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

    /* ---------------- Render Message ---------------- */
    const renderItem = ({ item }: any) => {
        const isCurrentUser = item.user_id === user?.id;

        return (
            <View
                style={[
                    styles.messageContainer,
                    isCurrentUser ? styles.messageRight : styles.messageLeft,
                ]}
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
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: "#ece5dd" }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={80}
        >
            {roomId ? (
                <FlatList
                    data={[...messages].reverse()}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 10 }}
                    inverted
                />
            ) : (
                <Text style={{ textAlign: "center", marginTop: 50 }}>
                    Loading chat......
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
        </KeyboardAvoidingView>
    );
};

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
    messageContainer: {
        marginVertical: 5,
        flexDirection: "row",
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
});

export default CommunityChat;

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, ScrollView, Platform, KeyboardAvoidingView, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { apiGetTickets, apiCreateTicket } from "@/services/TicketService";
import { apiUploadFile } from "@/services/ChatService";
import { apiGetUserSocieties } from "@/services/SocietyService";
import { TicketResponse, TicketStatus, TicketData } from "@/services/types";
import { getAuthData } from "@/hooks/helperHooks";
import { useTheme } from "@/hooks/useTheme";
import { AppTheme } from "@/constants/theme";

const STATUS_META: Record<TicketStatus, { bg: string; text: string; label: string }> = {
    Pending:     { bg: '#fef3c7', text: '#92400e', label: 'PENDING' },
    'In Progress': { bg: '#dbeafe', text: '#1e40af', label: 'IN PROGRESS' },
    Resolved:    { bg: '#d1fae5', text: '#065f46', label: 'RESOLVED' },
    Closed:      { bg: '#f1f5f9', text: '#475569', label: 'CLOSED' },
};

export default function TicketSystemScreen() {
    const theme = useTheme();
    const s = makeStyles(theme);
    const router = useRouter();
    const [tickets, setTickets] = useState<TicketResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [societyId, setSocietyId] = useState<string | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [complaintImageUrl, setComplaintImageUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isUserAdmin = user?.role === 'admin';

    const fetchTickets = async (sId: string) => {
        try {
            const res = await apiGetTickets(sId);
            if (res.success && res.result) setTickets(res.result);
        } catch (error: any) {
            console.error("Ticket fetch error:", error);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const { userData } = await getAuthData();
                if (!userData) return;
                setUser(userData);
                const societyRes = await apiGetUserSocieties(userData.id);
                if (societyRes.result && societyRes.result[0]) {
                    const sId = societyRes.result[0]._id;
                    setSocietyId(sId);
                    await fetchTickets(sId);
                }
            } catch (error: any) {
                Alert.alert('Error', error?.message || 'Failed to load tickets.');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    useFocusEffect(useCallback(() => { if (societyId) fetchTickets(societyId); }, [societyId]));

    const handleSubmit = async () => {
        if (!subject.trim() || !description.trim()) {
            Alert.alert("Validation", "Please fill in all fields.");
            return;
        }
        setIsSubmitting(true);
        try {
            const ticketData: TicketData = { subject: subject.trim(), description: description.trim(), imageUrl: complaintImageUrl || undefined, createdBy: user.id, societyId: societyId! };
            const res = await apiCreateTicket(ticketData);
            if (res.success) {
                Alert.alert("Success", "Complaint submitted!");
                setIsModalVisible(false);
                setSubject(''); setDescription(''); setComplaintImageUrl(null);
                fetchTickets(societyId!);
            }
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to submit complaint.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const pickAndUploadImage = async (source: 'camera' | 'gallery') => {
        try {
            if (source === 'camera') {
                const permission = await ImagePicker.requestCameraPermissionsAsync();
                if (!permission.granted) { Alert.alert('Permission Required', 'Camera permission is needed.'); return; }
                const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
                if (result.canceled) return;
                const asset = result.assets[0];
                const uploaded = await apiUploadFile({ uri: asset.uri, name: `complaint-${Date.now()}.${asset.uri.split('.').pop() || 'jpg'}`, mimeType: asset.mimeType || 'image/jpeg' });
                setComplaintImageUrl(uploaded);
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
            if (result.canceled) return;
            const asset = result.assets[0];
            const uploaded = await apiUploadFile({ uri: asset.uri, name: `complaint-${Date.now()}.${asset.uri.split('.').pop() || 'jpg'}`, mimeType: asset.mimeType || 'image/jpeg' });
            setComplaintImageUrl(uploaded);
        } catch {
            Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
        }
    };

    const renderTicket = ({ item, index }: { item: TicketResponse; index: number }) => {
        const meta = STATUS_META[item.status] ?? STATUS_META.Pending;
        return (
            <TouchableOpacity style={[s.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]} onPress={() => router.push(`/ticket-detail?id=${item._id}`)} activeOpacity={0.7}>
                <View style={s.cardHeader}>
                    <View style={[s.numberBadge, { backgroundColor: theme.surfaceSubtle }]}>
                        <Text style={[s.ticketNumber, { color: theme.textSecondary }]}>#{index + 1}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[s.statusText, { color: meta.text }]}>{meta.label}</Text>
                    </View>
                </View>
                <Text style={[s.cardTitle, { color: theme.text }]}>{item.subject}</Text>
                <View style={s.cardMeta}>
                    <View style={s.metaItem}>
                        <Ionicons name="person-outline" size={12} color={theme.textMuted} />
                        <Text style={[s.metaText, { color: theme.textSecondary }]}>{item.createdBy.name}</Text>
                    </View>
                    <View style={s.metaItem}>
                        <Ionicons name="calendar-outline" size={12} color={theme.textMuted} />
                        <Text style={[s.metaText, { color: theme.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                </View>
                {isUserAdmin && (
                    <View style={[s.assignedBox, { borderTopColor: theme.borderLight }]}>
                        <Text style={[s.assignedLabel, { color: theme.textMuted }]}>Assigned to:</Text>
                        <Text style={[s.assignedValue, { color: theme.textSecondary }]}>{item.assignedTo?.name || 'Unassigned'}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return <View style={[s.container, s.center, { backgroundColor: theme.bg }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
    }

    return (
        <View style={[s.container, { backgroundColor: theme.bg }]}>
            <View style={[s.listHeader, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}>
                <Text style={[s.title, { color: theme.text }]}>Complaints</Text>
                <TouchableOpacity style={[s.addBtn, { backgroundColor: theme.primary }]} onPress={() => setIsModalVisible(true)}>
                    <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={tickets}
                keyExtractor={(item) => item._id}
                renderItem={renderTicket}
                contentContainerStyle={s.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={s.empty}>
                        <View style={[s.emptyIcon, { backgroundColor: theme.primaryLight }]}>
                            <Ionicons name="mail-unread-outline" size={36} color={theme.primary} />
                        </View>
                        <Text style={[s.emptyTitle, { color: theme.text }]}>No complaints yet</Text>
                        <Text style={[s.emptyMsg, { color: theme.textMuted }]}>Tap the + button to submit a new complaint.</Text>
                    </View>
                }
            />

            <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={() => setIsModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <Pressable style={s.overlay} onPress={() => setIsModalVisible(false)}>
                    <View style={[s.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
                        <View style={s.sheetHandle} />
                        <View style={s.sheetHeader}>
                            <Text style={[s.sheetTitle, { color: theme.text }]}>New Complaint</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={[s.closeBtn, { backgroundColor: theme.surfaceSubtle }]}>
                                <Ionicons name="close" size={18} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={s.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={[s.label, { color: theme.textSecondary }]}>Subject</Text>
                            <TextInput style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} placeholder="Summary of the issue" placeholderTextColor={theme.textMuted} value={subject} onChangeText={setSubject} />

                            <Text style={[s.label, { color: theme.textSecondary }]}>Description</Text>
                            <TextInput style={[s.input, s.textArea, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} placeholder="Detailed description..." placeholderTextColor={theme.textMuted} value={description} onChangeText={setDescription} multiline numberOfLines={5} />

                            <Text style={[s.label, { color: theme.textSecondary }]}>Attachment (Optional)</Text>
                            <View style={s.attachRow}>
                                <TouchableOpacity style={[s.attachBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primaryMid }]} onPress={() => pickAndUploadImage('camera')}>
                                    <Ionicons name="camera-outline" size={16} color={theme.primary} />
                                    <Text style={[s.attachBtnText, { color: theme.primary }]}>Camera</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.attachBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primaryMid }]} onPress={() => pickAndUploadImage('gallery')}>
                                    <Ionicons name="images-outline" size={16} color={theme.primary} />
                                    <Text style={[s.attachBtnText, { color: theme.primary }]}>Gallery</Text>
                                </TouchableOpacity>
                            </View>

                            {complaintImageUrl && (
                                <View style={[s.previewWrap, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                                    <Image source={{ uri: complaintImageUrl }} style={s.previewImage} />
                                    <TouchableOpacity style={s.removeBtn} onPress={() => setComplaintImageUrl(null)}>
                                        <Ionicons name="trash-outline" size={14} color={theme.danger} />
                                        <Text style={[s.removeText, { color: theme.danger }]}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.primary }]} onPress={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Submit Complaint</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

function makeStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1 },
        center: { justifyContent: 'center', alignItems: 'center' },
        listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
        title: { fontSize: 22, fontWeight: '800' },
        addBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
        listContent: { padding: 16, paddingBottom: 40 },
        card: { borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
        cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
        numberBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
        ticketNumber: { fontSize: 12, fontWeight: '700' },
        statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
        statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
        cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
        cardMeta: { flexDirection: 'row', gap: 16, marginBottom: 10 },
        metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        metaText: { fontSize: 13, fontWeight: '500' },
        assignedBox: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, marginTop: 4 },
        assignedLabel: { fontSize: 12, marginRight: 6 },
        assignedValue: { fontSize: 13, fontWeight: '600' },
        empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
        emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
        emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
        emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
        sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '88%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
        sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 16 },
        sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
        sheetTitle: { fontSize: 20, fontWeight: '800' },
        closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
        formContent: { paddingBottom: 40 },
        label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 2 },
        input: { borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 18, borderWidth: 1 },
        textArea: { height: 110, textAlignVertical: 'top' },
        attachRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
        attachBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
        attachBtnText: { fontWeight: '700', fontSize: 13 },
        previewWrap: { borderRadius: 14, borderWidth: 1, padding: 10, marginBottom: 18 },
        previewImage: { width: '100%', height: 140, borderRadius: 10, marginBottom: 8 },
        removeBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff1f2' },
        removeText: { fontWeight: '700', fontSize: 12 },
        submitBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
        submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    });
}

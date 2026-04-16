import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuthData } from '@/hooks/helperHooks';
import {
    apiGetAnnouncements,
    apiCreateAnnouncement,
    apiUpdateAnnouncement,
    apiDeleteAnnouncement
} from '@/services/AnnouncementService';
import { Announcement } from '@/services/types';
import { apiGetUserSocieties } from '@/services/SocietyService';

export default function AnnouncementsScreen() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formMessage, setFormMessage] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { userData } = await getAuthData();
            const res = await apiGetUserSocieties(userData.id);
            const selectedSociety = res.result;
            if (userData && selectedSociety.length > 0) {
                setUser(userData);
                const announcementsRes = await apiGetAnnouncements(selectedSociety[0]._id);
                if (announcementsRes.success) {
                    setAnnouncements(announcementsRes.result);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const openModal = (item?: Announcement) => {
        if (item) {
            setEditingId(item._id);
            setFormTitle(item.title);
            setFormMessage(item.message);
        } else {
            setEditingId(null);
            setFormTitle('');
            setFormMessage('');
        }
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!formTitle.trim() || !formMessage.trim()) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        setSubmitting(true);
        try {
            const resSoc = await apiGetUserSocieties(user.id);
            const selectedSociety = resSoc.result[0];
            if (editingId) {
                const res = await apiUpdateAnnouncement(editingId, { title: formTitle, message: formMessage });
                if (res.success) {
                    setAnnouncements(prev => prev.map(item => item._id === editingId ? res.result : item));
                    setModalVisible(false);
                }
            } else {
                if (!selectedSociety._id) return;
                const res = await apiCreateAnnouncement({
                    society_id: selectedSociety._id,
                    user_id: user.id,
                    title: formTitle,
                    message: formMessage
                });
                if (res.success) {
                    setAnnouncements(prev => [res.result, ...prev]);
                    setModalVisible(false);
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert("Confirm Delete", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await apiDeleteAnnouncement(id);
                        setAnnouncements(prev => prev.filter(a => a._id !== id));
                    } catch {
                        Alert.alert("Error", "Failed to delete");
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: Announcement }) => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMessage}>{item.message}</Text>
                <View style={styles.cardFooter}>
                    <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
                    <Text style={styles.date}>{new Date(item.created_at).toDateString()}</Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
                    <Ionicons name="create-outline" size={22} color="#4f46e5" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={announcements}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="megaphone-outline" size={60} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No announcements posted.</Text>
                        </View>
                    }
                    ListHeaderComponent={
                        <View style={styles.header}>
                            <Text style={styles.title}>Announcements</Text>
                            <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
                                <Ionicons name="add" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Create/Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                        <View style={styles.modalContainer} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {editingId ? 'Edit Post' : 'New Announcement'}
                                </Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#1e293b" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <Text style={styles.label}>Headline</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formTitle}
                                    onChangeText={setFormTitle}
                                    placeholder="e.g. Maintenance Scheduled"
                                    placeholderTextColor="#94a3b8"
                                />

                                <Text style={styles.label}>Message Body</Text>
                                <TextInput
                                    style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
                                    value={formMessage}
                                    onChangeText={setFormMessage}
                                    multiline
                                    placeholder="Enter details..."
                                    placeholderTextColor="#94a3b8"
                                />

                                <TouchableOpacity 
                                    style={styles.submitBtn} 
                                    onPress={handleSave}
                                    disabled={submitting}
                                >
                                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Post Announcement</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: "800",
        color: '#1e293b',
    },
    addBtn: {
        backgroundColor: '#4f46e5',
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    card: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardContent: { flex: 1, marginRight: 10 },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
    cardMessage: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    date: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    actions: { justifyContent: 'center', gap: 12 },
    actionBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    
    emptyState: { alignItems: 'center', marginTop: 80 },
    emptyText: { marginTop: 16, fontSize: 16, color: '#94a3b8', fontWeight: '500' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, fontSize: 16, color: '#1e293b', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    submitBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#4f46e5', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
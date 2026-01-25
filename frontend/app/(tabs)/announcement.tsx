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
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAuthData } from '@/hooks/helperHooks';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
    apiGetAnnouncements,
    apiCreateAnnouncement,
    apiUpdateAnnouncement,
    apiDeleteAnnouncement
} from '@/services/AnnouncementService';
import { Announcement } from '@/services/types';
import { apiGetUserSocieties } from '@/services/SocietyService';

export default function AnnouncementsScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const router = useRouter();

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
        const { userData } = await getAuthData();
        const res = await apiGetUserSocieties(userData.id);
        console.log("jkashdkahsjkdhakjdha",res.result[0])
        const selectedSociety = res.result;
        if (userData && selectedSociety.length > 0) {
            setUser(userData);
            // if (selectedSociety[0]._id) {
                const res = await apiGetAnnouncements(selectedSociety[0]._id);
                console.log("sdjashjdajdhakjh",res)
                if (res.success) {
                    setAnnouncements(res.result);
                }
            // }
        }
        setLoading(false);
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
        const res = await apiGetUserSocieties(user.id);
        const selectedSociety = res.result[0];
        try {
            if (editingId) {
                // Update
                const res = await apiUpdateAnnouncement(editingId, { title: formTitle, message: formMessage });
                if (res.success) {
                    setAnnouncements(prev => prev.map(item => item._id === editingId ? res.result : item));
                    setModalVisible(false);
                } else {
                    Alert.alert("Error", res.message);
                }
            } else {
                // Create
                if (!selectedSociety._id) {
                    Alert.alert("Error", "User society not found");
                    return;
                }
                const res = await apiCreateAnnouncement({
                    society_id: selectedSociety._id,
                    user_id: user.id,
                    title: formTitle,
                    message: formMessage
                });
                if (res.success) {
                    setAnnouncements(prev => [res.result, ...prev]);
                    setModalVisible(false);
                } else {
                    Alert.alert("Error", res.message);
                }
            }
        } catch (e: any) {
            Alert.alert("Error", e.message || "Operation failed");
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
                    } catch (e) {
                        Alert.alert("Error", "Failed to delete");
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: Announcement }) => (
        <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.cardMessage, { color: '#666' }]}>{item.message}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toDateString()}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
                    <Ionicons name="create-outline" size={24} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={24} color="#F44336" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            {loading ? (
                <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={announcements}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>No announcements found.</Text>}
                    ListHeaderComponent={
                        <View style={styles.header}>
                            {/* <Text style={[styles.title, { color: theme.text }]}>Manage Announcements</Text> */}
                            {/* Wrapper View to control Button Size */}
                            <View style={{ width: 250 }}>
                                <PrimaryButton title="Add New Announcement" onPress={() => openModal()} />
                            </View>
                        </View>
                    }
                />
            )}

            {/* Create/Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                {/* 1. KeyboardAvoidingView Wrapper */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    {/* 2. ScrollView to handle overflow */}
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[styles.modalContent, { backgroundColor: isDark ? '#222' : '#fff' }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>
                                {editingId ? 'Edit Announcement' : 'New Announcement'}
                            </Text>

                            <Text style={[styles.label, { color: theme.text }]}>Title</Text>
                            <TextInput
                                style={[styles.input, { color: theme.text, borderColor: '#ccc' }]}
                                value={formTitle}
                                onChangeText={setFormTitle}
                                placeholder="e.g. Water Supply Issue"
                                placeholderTextColor="#888"
                            />

                            <Text style={[styles.label, { color: theme.text }]}>Message</Text>
                            <TextInput
                                style={[styles.input, { height: 100, textAlignVertical: 'top', color: theme.text, borderColor: '#ccc' }]}
                                value={formMessage}
                                onChangeText={setFormMessage}
                                multiline
                                placeholder="Enter detailed message..."
                                placeholderTextColor="#888"
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginRight: 20 }}>
                                    <Text style={{ color: 'red', fontSize: 16 }}>Cancel</Text>
                                </TouchableOpacity>

                                {/* ✅ FIX: Wrapped PrimaryButton in a View to force width */}
                                <View style={{ width: 100 }}>
                                    <PrimaryButton
                                        title={submitting ? "Saving..." : "Save"}
                                        onPress={handleSave}
                                        disabled={submitting}
                                    />
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 20,
        // flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: 22, // Reduced slightly to fit row
        fontWeight: "bold",
    },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    cardMessage: { fontSize: 14, marginBottom: 8 },
    date: { fontSize: 12, color: '#888' },
    actions: { justifyContent: 'center', alignItems: 'center', gap: 10 },
    actionBtn: { padding: 5 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        padding: 20,
        borderRadius: 12,
        elevation: 5,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 5 },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 10,
    }
});
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuthData } from '@/hooks/helperHooks';
import { apiGetAnnouncements, apiCreateAnnouncement, apiUpdateAnnouncement, apiDeleteAnnouncement } from '@/services/AnnouncementService';
import { Announcement } from '@/services/types';
import { apiGetUserSocieties } from '@/services/SocietyService';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

export default function AnnouncementsScreen() {
    const theme = useTheme();
    const s = makeStyles(theme);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formMessage, setFormMessage] = useState('');

    useFocusEffect(useCallback(() => { loadData(); }, []));

    const loadData = async () => {
        setLoading(true);
        try {
            const { userData } = await getAuthData();
            const res = await apiGetUserSocieties(userData.id);
            const selectedSociety = res.result;
            if (userData && selectedSociety.length > 0) {
                setUser(userData);
                const announcementsRes = await apiGetAnnouncements(selectedSociety[0]._id);
                if (announcementsRes.success) setAnnouncements(announcementsRes.result);
            }
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to load announcements.');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (item?: Announcement) => {
        if (item) { setEditingId(item._id); setFormTitle(item.title); setFormMessage(item.message); }
        else { setEditingId(null); setFormTitle(''); setFormMessage(''); }
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!formTitle.trim() || !formMessage.trim()) { Alert.alert("Error", "Please fill all fields"); return; }
        setSubmitting(true);
        try {
            const resSoc = await apiGetUserSocieties(user.id);
            const selectedSociety = resSoc.result[0];
            if (editingId) {
                const res = await apiUpdateAnnouncement(editingId, { title: formTitle, message: formMessage });
                if (res.success) { setAnnouncements(prev => prev.map(item => item._id === editingId ? res.result : item)); setModalVisible(false); }
            } else {
                if (!selectedSociety._id) return;
                const res = await apiCreateAnnouncement({ society_id: selectedSociety._id, user_id: user.id, title: formTitle, message: formMessage });
                if (res.success) { setAnnouncements(prev => [res.result, ...prev]); setModalVisible(false); }
            }
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to save announcement.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert("Confirm Delete", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                try { await apiDeleteAnnouncement(id); setAnnouncements(prev => prev.filter(a => a._id !== id)); }
                catch { Alert.alert("Error", "Failed to delete"); }
            }}
        ]);
    };

    const renderItem = ({ item }: { item: Announcement }) => (
        <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={s.cardLeft}>
                <View style={[s.megaphoneBox, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name="megaphone-outline" size={18} color={theme.primary} />
                </View>
            </View>
            <View style={s.cardContent}>
                <Text style={[s.cardTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[s.cardMessage, { color: theme.textSecondary }]}>{item.message}</Text>
                <View style={s.cardFooter}>
                    <Ionicons name="calendar-outline" size={12} color={theme.textMuted} />
                    <Text style={[s.date, { color: theme.textMuted }]}>{new Date(item.created_at).toDateString()}</Text>
                </View>
            </View>
            <View style={s.actions}>
                <TouchableOpacity onPress={() => openModal(item)} style={[s.actionBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderLight }]}>
                    <Ionicons name="create-outline" size={18} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={[s.actionBtn, { backgroundColor: theme.dangerLight, borderColor: theme.borderLight }]}>
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[s.safeArea, { backgroundColor: theme.bg }]}>
            {loading ? (
                <View style={s.center}><ActivityIndicator size="large" color={theme.primary} /></View>
            ) : (
                <FlatList
                    data={announcements}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={s.empty}>
                            <View style={[s.emptyIcon, { backgroundColor: theme.primaryLight }]}>
                                <Ionicons name="megaphone-outline" size={36} color={theme.primary} />
                            </View>
                            <Text style={[s.emptyTitle, { color: theme.text }]}>No announcements yet</Text>
                            <Text style={[s.emptyMsg, { color: theme.textMuted }]}>Create a new announcement using the + button.</Text>
                        </View>
                    }
                    ListHeaderComponent={
                        <View style={s.listHeader}>
                            <Text style={[s.title, { color: theme.text }]}>Announcements</Text>
                            <TouchableOpacity style={[s.addBtn, { backgroundColor: theme.primary }]} onPress={() => openModal()}>
                                <Ionicons name="add" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <Pressable style={s.overlay} onPress={() => setModalVisible(false)}>
                        <View style={[s.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
                            <View style={s.sheetHandle} />
                            <View style={s.sheetHeader}>
                                <Text style={[s.sheetTitle, { color: theme.text }]}>{editingId ? 'Edit Post' : 'New Announcement'}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={[s.closeBtn, { backgroundColor: theme.surfaceSubtle }]}>
                                    <Ionicons name="close" size={18} color={theme.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
                                <Text style={[s.label, { color: theme.textSecondary }]}>Headline</Text>
                                <TextInput style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} value={formTitle} onChangeText={setFormTitle} placeholder="e.g. Maintenance Scheduled" placeholderTextColor={theme.textMuted} />

                                <Text style={[s.label, { color: theme.textSecondary }]}>Message Body</Text>
                                <TextInput style={[s.input, s.textArea, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} value={formMessage} onChangeText={setFormMessage} multiline placeholder="Enter details..." placeholderTextColor={theme.textMuted} />

                                <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.primary }]} onPress={handleSave} disabled={submitting}>
                                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Post Announcement</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

function makeStyles(theme: AppTheme) {
    return StyleSheet.create({
        safeArea: { flex: 1 },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        listContent: { padding: 20, paddingBottom: 40 },
        listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
        title: { fontSize: 22, fontWeight: '800' },
        addBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
        card: { flexDirection: 'row', padding: 16, borderRadius: 20, marginBottom: 14, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
        cardLeft: { marginRight: 12, alignItems: 'flex-start' },
        megaphoneBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
        cardContent: { flex: 1, marginRight: 8 },
        cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 5 },
        cardMessage: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
        cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        date: { fontSize: 11, fontWeight: '600' },
        actions: { justifyContent: 'center', gap: 8 },
        actionBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
        empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
        emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
        emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
        emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
        sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
        sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 16 },
        sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
        sheetTitle: { fontSize: 20, fontWeight: '800' },
        closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
        label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 2 },
        input: { borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 18, borderWidth: 1 },
        textArea: { height: 120, textAlignVertical: 'top' },
        submitBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
        submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    });
}

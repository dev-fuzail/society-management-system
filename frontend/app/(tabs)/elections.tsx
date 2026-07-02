import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, Modal, TextInput, KeyboardAvoidingView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { getAuthData } from '@/hooks/helperHooks';
import ElectionService, { Election } from '@/services/ElectionService';
import { apiGetUserSocieties } from '@/services/SocietyService';
import CalendarModal from '@/components/CalendarModal';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  ongoing:   { bg: '#d1fae5', text: '#065f46', label: 'ONGOING' },
  completed: { bg: '#f1f5f9', text: '#475569', label: 'COMPLETED' },
  upcoming:  { bg: '#ede9fe', text: '#4c1d95', label: 'UPCOMING' },
};

export default function ElectionsScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [societyId, setSocietyId] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStartDate, setNewStartDate] = useState<Date | null>(null);
  const [newEndDate, setNewEndDate] = useState<Date | null>(null);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const router = useRouter();

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select date…';
    return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const fetchElections = async () => {
    try {
      const { userData } = await getAuthData();
      setUserRole(userData.role);
      const res = await apiGetUserSocieties(userData.id);
      if (res.success && res.result.length > 0) {
        const sId = res.result[0]._id;
        setSocietyId(sId);
        const electionRes = await ElectionService.getElections(sId);
        if (electionRes.success) setElections(electionRes.result);
      }
    } catch (error) {
      console.error("Error fetching elections:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchElections(); }, []);

  const createElection = async () => {
    if (!newTitle.trim() || !newStartDate || !newEndDate) {
      Alert.alert('Validation', 'Title, start date, and end date are required.');
      return;
    }
    const startAt = new Date(newStartDate); startAt.setHours(0, 0, 0, 0);
    const endAt = new Date(newEndDate); endAt.setHours(23, 59, 59, 999);
    if (endAt <= startAt) { Alert.alert('Validation', 'End date must be after start date.'); return; }
    try {
      const res = await ElectionService.createElection({ title: newTitle.trim(), start_date: startAt.toISOString(), end_date: endAt.toISOString(), society_id: societyId });
      if (res.success) {
        setCreateModalVisible(false); setNewTitle(''); setNewStartDate(null); setNewEndDate(null);
        fetchElections();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create election.');
    }
  };

  const renderElectionCard = ({ item }: { item: Election }) => {
    const meta = STATUS_META[item.status] ?? STATUS_META.completed;
    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}
        onPress={() => router.push({ pathname: '/election-detail', params: { id: item._id } })}
        activeOpacity={0.7}
      >
        <View style={s.cardTop}>
          <View style={s.cardIconBox}>
            <Ionicons name="stats-chart-outline" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, { color: theme.text }]}>{item.title}</Text>
            <View style={[s.badge, { backgroundColor: meta.bg }]}>
              <Text style={[s.badgeText, { color: meta.text }]}>{meta.label}</Text>
            </View>
          </View>
        </View>

        <View style={[s.cardDates, { borderTopColor: theme.borderLight }]}>
          <View style={s.dateRow}>
            <Ionicons name="play-circle-outline" size={14} color={theme.success} />
            <Text style={[s.dateText, { color: theme.textSecondary }]}>
              Starts {new Date(item.start_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={s.dateRow}>
            <Ionicons name="stop-circle-outline" size={14} color={theme.danger} />
            <Text style={[s.dateText, { color: theme.textSecondary }]}>
              Ends {new Date(item.end_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={s.viewRow}>
            <Text style={[s.viewLink, { color: theme.primary }]}>View Candidates</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={[s.pageHeader, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}>
        <Text style={[s.pageTitle, { color: theme.text }]}>Committee Elections</Text>
        {userRole === 'admin' && (
          <TouchableOpacity style={[s.addBtn, { backgroundColor: theme.primary }]} onPress={() => setCreateModalVisible(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={elections}
          renderItem={renderElectionCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="stats-chart-outline" size={36} color={theme.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: theme.text }]}>No elections yet</Text>
              <Text style={[s.emptyMsg, { color: theme.textMuted }]}>Elections will appear here once created by an admin.</Text>
            </View>
          }
          onRefresh={fetchElections}
          refreshing={loading}
        />
      )}

      <Modal visible={createModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={24} style={{ flex: 1 }}>
          <Pressable style={s.overlay} onPress={() => setCreateModalVisible(false)}>
            <View style={[s.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <View style={s.sheetHandle} />
              <View style={s.sheetHeader}>
                <Text style={[s.sheetTitle, { color: theme.text }]}>Create Election</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={[s.closeBtn, { backgroundColor: theme.surfaceSubtle }]}>
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={[s.label, { color: theme.textSecondary }]}>Election Title</Text>
                <TextInput
                  style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="e.g. Society President 2026"
                  placeholderTextColor={theme.textMuted}
                />

                <Text style={[s.label, { color: theme.textSecondary }]}>Start Date</Text>
                <TouchableOpacity style={[s.datePicker, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]} onPress={() => setShowStartCalendar(true)}>
                  <Ionicons name="calendar-outline" size={16} color={theme.primary} />
                  <Text style={[s.datePickerText, { color: newStartDate ? theme.text : theme.textMuted }]}>{formatDate(newStartDate)}</Text>
                </TouchableOpacity>

                <Text style={[s.label, { color: theme.textSecondary }]}>End Date</Text>
                <TouchableOpacity style={[s.datePicker, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]} onPress={() => setShowEndCalendar(true)}>
                  <Ionicons name="calendar-outline" size={16} color={theme.primary} />
                  <Text style={[s.datePickerText, { color: newEndDate ? theme.text : theme.textMuted }]}>{formatDate(newEndDate)}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.primary }]} onPress={createElection}>
                  <Ionicons name="rocket-outline" size={18} color="#fff" />
                  <Text style={s.submitText}>Launch Election</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <CalendarModal visible={showStartCalendar} title="Select Start Date" initialDate={newStartDate || new Date()} onClose={() => setShowStartCalendar(false)} onSelect={(date) => setNewStartDate(date)} />
      <CalendarModal visible={showEndCalendar} title="Select End Date" initialDate={newEndDate || new Date()} minDate={newStartDate || undefined} onClose={() => setShowEndCalendar(false)} onSelect={(date) => setNewEndDate(date)} />
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
    pageTitle: { fontSize: 22, fontWeight: '800' },
    addBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, paddingBottom: 40 },
    card: { borderRadius: 20, marginBottom: 14, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 18 },
    cardIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
    cardDates: { paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, gap: 8 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateText: { fontSize: 13, fontWeight: '500' },
    viewRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    viewLink: { fontSize: 13, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 8, maxHeight: '85%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 16 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    sheetTitle: { fontSize: 20, fontWeight: '800' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 2 },
    input: { borderRadius: 14, padding: 16, fontSize: 15, marginBottom: 20, borderWidth: 1 },
    datePicker: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1 },
    datePickerText: { fontSize: 15, fontWeight: '500' },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16, marginTop: 8 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}

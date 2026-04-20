import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, Modal, TextInput, KeyboardAvoidingView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { getAuthData } from '@/hooks/helperHooks';
import ElectionService, { Election } from '@/services/ElectionService';
import { apiGetUserSocieties } from '@/services/SocietyService';
import CalendarModal from '@/components/CalendarModal';

export default function ElectionsScreen() {
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
    if (!date) return 'YYYY-MM-DD';
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
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
        if (electionRes.success) {
          setElections(electionRes.result);
        }
      }
    } catch (error) {
      console.error("Error fetching elections:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  const createElection = async () => {
    if (!newTitle.trim() || !newStartDate || !newEndDate) {
      Alert.alert('Validation', 'Title, start date, and end date are required.');
      return;
    }

    try {
      const startAt = new Date(newStartDate);
      startAt.setHours(0, 0, 0, 0);

      const endAt = new Date(newEndDate);
      endAt.setHours(23, 59, 59, 999);

      if (endAt <= startAt) {
        Alert.alert('Validation', 'End date must be after start date.');
        return;
      }

      const res = await ElectionService.createElection({
        title: newTitle.trim(),
        start_date: startAt.toISOString(),
        end_date: endAt.toISOString(),
        society_id: societyId,
      });

      if (res.success) {
        setCreateModalVisible(false);
        setNewTitle('');
        setNewStartDate(null);
        setNewEndDate(null);
        fetchElections();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create election.');
    }
  };

  const renderElectionCard = ({ item }: { item: Election }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push({ pathname: '/election-detail', params: { id: item._id } })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: item.status === 'ongoing' ? '#dcfce7' : '#f1f5f9' }]}>
          <Text style={[styles.badgeText, { color: item.status === 'ongoing' ? '#059669' : '#64748b' }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <View style={styles.iconBox}>
            <Ionicons name="time-outline" size={14} color="#4f46e5" />
          </View>
          <Text style={styles.infoText}>Starts: {new Date(item.start_date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.iconBox}>
            <Ionicons name="calendar-outline" size={14} color="#ef4444" />
          </View>
          <Text style={styles.infoText}>Ends: {new Date(item.end_date).toLocaleDateString()}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.footerLink}>View Candidates</Text>
        <Ionicons name="chevron-forward" size={16} color="#4f46e5" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#f8fafc' }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Committee Elections</Text>
        {userRole === 'admin' && (
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={elections}
          renderItem={renderElectionCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="stats-chart-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No elections scheduled.</Text>
            </View>
          }
          onRefresh={fetchElections}
          refreshing={loading}
        />
      )}

      <Modal visible={createModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={24}
          style={{ flex: 1 }}
        >
            <Pressable style={styles.modalOverlay} onPress={() => setCreateModalVisible(false)}>
                <View style={styles.modalContainer} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Create Election</Text>
                        <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#1e293b" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
                            value={newTitle}
                            onChangeText={setNewTitle}
                            placeholder="e.g. Society President 2026"
                        />
                        <Text style={styles.label}>Start Date</Text>
                        <TouchableOpacity style={styles.input} activeOpacity={0.8} onPress={() => setShowStartCalendar(true)}>
                          <Text style={[styles.dateValue, !newStartDate && styles.datePlaceholder]}>{formatDate(newStartDate)}</Text>
                        </TouchableOpacity>
                        <Text style={styles.label}>End Date</Text>
                        <TouchableOpacity style={styles.input} activeOpacity={0.8} onPress={() => setShowEndCalendar(true)}>
                          <Text style={[styles.dateValue, !newEndDate && styles.datePlaceholder]}>{formatDate(newEndDate)}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.saveButton} onPress={createElection}>
                            <Text style={styles.saveButtonText}>Launch Election</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <CalendarModal
        visible={showStartCalendar}
        title="Select Start Date"
        initialDate={newStartDate || new Date()}
        onClose={() => setShowStartCalendar(false)}
        onSelect={(date) => setNewStartDate(date)}
      />

      <CalendarModal
        visible={showEndCalendar}
        title="Select End Date"
        initialDate={newEndDate || new Date()}
        minDate={newStartDate || undefined}
        onClose={() => setShowEndCalendar(false)}
        onSelect={(date) => setNewEndDate(date)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  addButton: { 
    backgroundColor: '#4f46e5', 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  list: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardBody: { gap: 10, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  infoText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerLink: { fontSize: 14, color: '#4f46e5', fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#94a3b8', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContainer: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  modalScrollContent: { paddingBottom: 28 },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateValue: { color: '#1e293b', fontSize: 16 },
  datePlaceholder: { color: '#94a3b8' },
  saveButton: { 
    backgroundColor: '#4f46e5', 
    padding: 18, 
    borderRadius: 16, 
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#4f46e5',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

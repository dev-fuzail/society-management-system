import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { getAuthData } from '@/hooks/helperHooks';
import ElectionService, { Election } from '@/services/ElectionService';
import { apiGetUserSocieties } from '@/services/SocietyService';

export default function ElectionsScreen() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [societyId, setSocietyId] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const router = useRouter();

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
    if (!newTitle.trim() || !newStartDate.trim() || !newEndDate.trim()) {
      Alert.alert('Validation', 'Title, start date, and end date are required.');
      return;
    }

    try {
      const startIso = new Date(`${newStartDate}T00:00:00`).toISOString();
      const endIso = new Date(`${newEndDate}T23:59:59`).toISOString();

      if (new Date(endIso) <= new Date(startIso)) {
        Alert.alert('Validation', 'End date must be after start date.');
        return;
      }

      const res = await ElectionService.createElection({
        title: newTitle.trim(),
        start_date: startIso,
        end_date: endIso,
        society_id: societyId,
      });

      if (res.success) {
        setCreateModalVisible(false);
        setNewTitle('');
        setNewStartDate('');
        setNewEndDate('');
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
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: item.status === 'ongoing' ? '#C8E6C9' : '#FFCDD2' }]}>
          <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoText}>Starts: {new Date(item.start_date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoText}>Ends: {new Date(item.end_date).toLocaleDateString()}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" style={styles.chevron} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
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
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="stats-chart-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No elections found.</Text>
            </View>
          }
          onRefresh={fetchElections}
          refreshing={loading}
        />
      )}

      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Election</Text>
            <TextInput
              style={styles.input}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Election title"
            />
            <TextInput
              style={styles.input}
              value={newStartDate}
              onChangeText={setNewStartDate}
              placeholder="Start date (YYYY-MM-DD)"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={newEndDate}
              onChangeText={setNewEndDate}
              placeholder="End date (YYYY-MM-DD)"
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={createElection}>
                <Text style={styles.saveButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#333' },
  addButton: { backgroundColor: '#4f46e5', padding: 8, borderRadius: 8 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#333', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#333' },
  cardBody: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: '#666' },
  chevron: { position: 'absolute', right: 16, bottom: 16 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '86%', backgroundColor: '#fff', borderRadius: 12, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#1f2937' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 10 },
  cancelButtonText: { color: '#6b7280', fontWeight: '700' },
  saveButton: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  saveButtonText: { color: '#fff', fontWeight: '700' },
});

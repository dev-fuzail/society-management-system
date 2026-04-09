import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
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
            onPress={() => Alert.alert("Feature coming soon", "Election creation form will be here.")}
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
  emptyText: { marginTop: 16, fontSize: 16, color: '#999' }
});

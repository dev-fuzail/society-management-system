import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { getAuthData } from '@/hooks/helperHooks';
import ServiceProviderService, { ServiceProvider } from '@/services/ServiceProviderService';
import { apiGetUserSocieties } from '@/services/SocietyService';

export default function ServiceProvidersScreen() {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [societyId, setSocietyId] = useState('');
  const [search, setSearch] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [providerCategory, setProviderCategory] = useState('');
  const [providerContact, setProviderContact] = useState('');
  const router = useRouter();

  const fetchProviders = async () => {
    try {
      const { userData } = await getAuthData();
      setUserRole(userData.role);
      
      const res = await apiGetUserSocieties(userData.id);
      if (res.success && res.result.length > 0) {
        const sId = res.result[0]._id;
        setSocietyId(sId);
        const providerRes = await ServiceProviderService.getProviders(sId);
        if (providerRes.success) {
          setProviders(providerRes.result);
        }
      }
    } catch (error) {
      console.error("Error fetching providers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleCreateProvider = async () => {
    if (!providerName.trim() || !providerCategory.trim() || !providerContact.trim()) {
      Alert.alert('Validation', 'Name, category and contact are required.');
      return;
    }

    try {
      const res = await ServiceProviderService.addProvider({
        name: providerName.trim(),
        category: providerCategory.trim().toUpperCase(),
        contact: providerContact.trim(),
        society_id: societyId,
      });

      if (res.success) {
        setCreateModalVisible(false);
        setProviderName('');
        setProviderCategory('');
        setProviderContact('');
        fetchProviders();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add provider.');
    }
  };

  const handleBook = (provider: ServiceProvider) => {
    Alert.alert(
      "Confirm Booking",
      `Do you want to book ${provider.name} for today?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Book", 
          onPress: async () => {
            try {
              const res = await ServiceProviderService.bookProvider({
                provider_id: provider._id,
                date: new Date().toISOString(),
                society_id: societyId
              });
              if (res.success) {
                Alert.alert("Success", "Booking request sent!");
                router.push('/service-bookings');
              }
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to book.");
            }
          }
        }
      ]
    );
  };

  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const renderProviderCard = ({ item }: { item: ServiceProvider }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.providerIcon}>
          <Ionicons name="construct-outline" size={24} color="#4f46e5" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.category}>{item.category}</Text>
        </View>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#fbbf24" />
          <Text style={styles.ratingText}>{item.average_rating.toFixed(1)}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.contactButton} onPress={() => Alert.alert("Contact", item.contact)}>
          <Ionicons name="call-outline" size={18} color="#4f46e5" />
          <Text style={styles.contactText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookButton} onPress={() => handleBook(item)}>
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Providers</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {userRole === 'admin' && (
            <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
              <Ionicons name="add-circle-outline" size={24} color="#4f46e5" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push('/service-bookings')}>
            <Ionicons name="list-outline" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or category..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredProviders}
          renderItem={renderProviderCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No providers found.</Text>
            </View>
          }
          onRefresh={fetchProviders}
          refreshing={loading}
        />
      )}

      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Service Provider</Text>
            <TextInput
              style={styles.modalInput}
              value={providerName}
              onChangeText={setProviderName}
              placeholder="Provider name"
            />
            <TextInput
              style={styles.modalInput}
              value={providerCategory}
              onChangeText={setProviderCategory}
              placeholder="Category (e.g. PLUMBING)"
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              value={providerContact}
              onChangeText={setProviderContact}
              placeholder="Contact"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleCreateProvider}>
                <Text style={styles.submitButtonText}>Save</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomColor: '#ddd'
  },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  providerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: '#333' },
  category: { fontSize: 14, color: '#666' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingText: { fontSize: 14, fontWeight: '700', color: '#9a3412' },
  cardFooter: { flexDirection: 'row', gap: 12 },
  contactButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#4f46e5' },
  contactText: { color: '#4f46e5', fontWeight: '600' },
  bookButton: { flex: 2, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
  bookButtonText: { color: '#fff', fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '86%', backgroundColor: '#fff', borderRadius: 12, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#1f2937' },
  modalInput: {
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
  submitButton: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  submitButtonText: { color: '#fff', fontWeight: '700' },
});

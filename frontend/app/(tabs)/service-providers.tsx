import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, TextInput, Modal, ScrollView, KeyboardAvoidingView, Pressable, Platform, Linking } from 'react-native';
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
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState('');
  const [providerName, setProviderName] = useState('');
  const [providerCategory, setProviderCategory] = useState('');
  const [providerContact, setProviderContact] = useState('');
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const router = useRouter();

  const handleApiError = (error: any, fallbackMessage: string) => {
    if (error?.isAuthError || error?.statusCode === 401) {
      Alert.alert('Session Expired', 'Please log in again.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    Alert.alert('Error', error?.message || fallbackMessage);
  };

  const fetchProviders = async () => {
    try {
      const { userData } = await getAuthData();
      if (!userData?.id) {
        Alert.alert('Session Expired', 'Please log in again.', [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
        return;
      }

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
    } catch (error: any) {
      handleApiError(error, 'Failed to load service providers.');
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
      handleApiError(error, 'Failed to add provider.');
    }
  };

  const openEditProvider = (provider: ServiceProvider) => {
    setEditingProviderId(provider._id);
    setProviderName(provider.name || '');
    setProviderCategory(provider.category || '');
    setProviderContact(provider.contact || '');
    setEditModalVisible(true);
  };

  const handleUpdateProvider = async () => {
    if (!editingProviderId) return;
    if (!providerName.trim() || !providerCategory.trim() || !providerContact.trim()) {
      Alert.alert('Validation', 'Name, category and contact are required.');
      return;
    }

    try {
      const res = await ServiceProviderService.updateProvider(editingProviderId, {
        name: providerName.trim(),
        category: providerCategory.trim().toUpperCase(),
        contact: providerContact.trim(),
      });

      if (res.success) {
        setEditModalVisible(false);
        setEditingProviderId('');
        setProviderName('');
        setProviderCategory('');
        setProviderContact('');
        fetchProviders();
      }
    } catch (error: any) {
      handleApiError(error, 'Failed to update provider.');
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
              handleApiError(error, 'Failed to book service.');
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

  const openContactModal = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setContactModalVisible(true);
  };

  const callNumber = (number: string) => {
    const url = `tel:${number}`;
    Linking.canOpenURL(url).then(can => {
      if (can) Linking.openURL(url);
      else Alert.alert('Cannot Call', 'Phone calls are not available on this device.');
    });
  };

  const renderProviderCard = ({ item }: { item: ServiceProvider }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.providerIconBox}>
          <Ionicons name="construct-outline" size={24} color="#4f46e5" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>
        {userRole === 'admin' ? (
          <TouchableOpacity style={styles.editIconBtn} onPress={() => openEditProvider(item)}>
            <Ionicons name="create-outline" size={16} color="#4f46e5" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.reviewsRow}>
        <View style={styles.reviewsPill}>
          <Ionicons name="star" size={14} color="#fbbf24" />
          <Text style={styles.reviewsText}>{item.average_rating.toFixed(1)} • {item.total_reviews} reviews</Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.contactBtn} onPress={() => callNumber(item.contact)}>
          <Ionicons name="call" size={18} color="#4f46e5" />
          <Text style={styles.contactBtnText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(item)}>
          <Text style={styles.bookBtnText}>Book Service</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#f8fafc' }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Providers</Text>
        <View style={styles.headerActions}>
          {userRole === 'admin' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModalVisible(true)}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.historyBtn} onPress={() => router.push('/service-bookings')}>
            <Ionicons name="time-outline" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchField}
          placeholder="Search plumbing, electrical..."
          placeholderTextColor="#94a3b8"
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
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={60} color="#cbd5e1" />
              <Text style={styles.emptyText}>No service providers found.</Text>
            </View>
          }
          onRefresh={fetchProviders}
          refreshing={loading}
        />
      )}

      <Modal visible={createModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <Pressable style={styles.modalOverlay} onPress={() => setCreateModalVisible(false)}>
                <View style={styles.modalContainer} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Provider</Text>
                        <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#1e293b" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={providerName}
                            onChangeText={setProviderName}
                            placeholder="Enter provider name"
                        />
                        <Text style={styles.label}>Category</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={providerCategory}
                            onChangeText={setProviderCategory}
                            placeholder="e.g. PLUMBING"
                            autoCapitalize="characters"
                        />
                        <Text style={styles.label}>Contact Number</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={providerContact}
                            onChangeText={setProviderContact}
                            placeholder="Enter phone number"
                            keyboardType="phone-pad"
                        />

                        <TouchableOpacity style={styles.submitBtn} onPress={handleCreateProvider}>
                            <Text style={styles.submitBtnText}>Add Provider</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={contactModalVisible} transparent animationType="fade" onRequestClose={() => setContactModalVisible(false)}>
        <Pressable style={styles.modalOverlayCenter} onPress={() => setContactModalVisible(false)}>
          <View style={styles.contactModalCard} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
            <View style={styles.contactModalHeader}>
              <Text style={styles.contactModalTitle}>Contact Info</Text>
              <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                <Ionicons name="close" size={22} color="#1e293b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.contactSubtitle}>You can reach {selectedProvider?.name} at:</Text>
            <Text selectable style={styles.contactNumber}>{selectedProvider?.contact}</Text>

            <View style={styles.contactActionsRow}>
              <TouchableOpacity style={styles.callNowBtn} onPress={() => { setContactModalVisible(false); callNumber(selectedProvider!.contact); }}>
                <Ionicons name="call" size={16} color="#fff" />
                <Text style={styles.callNowBtnText}>Call Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={() => setContactModalVisible(false)}>
                <Text style={styles.doneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

        <Modal visible={editModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setEditModalVisible(false)}>
            <View style={styles.modalContainer} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Provider</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>
                    
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={providerName}
                  onChangeText={setProviderName}
                  placeholder="Enter provider name"
                />
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.modalInput}
                  value={providerCategory}
                  onChangeText={setProviderCategory}
                  placeholder="e.g. PLUMBING"
                  autoCapitalize="characters"
                />
                <Text style={styles.label}>Contact Number</Text>
                <TextInput
                  style={styles.modalInput}
                  value={providerContact}
                  onChangeText={setProviderContact}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateProvider}>
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
        </Modal>
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
  headerActions: { flexDirection: 'row', gap: 12 },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  historyBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchField: { flex: 1, paddingVertical: 12, marginLeft: 10, fontSize: 15, color: '#1e293b' },
  
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
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
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
  providerIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  categoryBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  categoryText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  editIconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe', justifyContent: 'center', alignItems: 'center' },
  reviewsRow: { marginBottom: 12 },
  reviewsPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  reviewsText: { color: '#b45309', fontSize: 12, fontWeight: '700' },
  
  cardActions: { flexDirection: 'row', gap: 12 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0' },
  contactBtnText: { color: '#4f46e5', fontWeight: '700', fontSize: 14 },
  bookBtn: { flex: 1.5, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#94a3b8', fontWeight: '500' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  contactModalCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  contactModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  contactModalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  contactSubtitle: { color: '#475569', fontSize: 14, marginBottom: 10 },
  contactNumber: { color: '#0f172a', fontSize: 22, fontWeight: '800', letterSpacing: 0.5, marginBottom: 14 },
  contactActionsRow: { flexDirection: 'row', gap: 10 },
  callNowBtn: { flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 12 },
  callNowBtnText: { color: '#fff', fontWeight: '700' },
  doneBtn: { flex: 1, backgroundColor: '#4f46e5', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  doneBtnText: { color: '#fff', fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4 },
  modalInput: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, fontSize: 16, color: '#1e293b', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  submitBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#4f46e5', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

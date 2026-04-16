import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, TextInput, Modal, ScrollView, KeyboardAvoidingView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { getAuthData } from '@/hooks/helperHooks';
import AmenityService, { Amenity } from '@/services/AmenityService';
import { apiGetUserSocieties } from '@/services/SocietyService';

export default function AmenitiesScreen() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('resident');
  const [societyId, setSocietyId] = useState('');
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [guestCount, setGuestCount] = useState('1');
  const [bookingHours, setBookingHours] = useState('1');
  const [totalPrice, setTotalPrice] = useState(0);
  const [newAmenityName, setNewAmenityName] = useState('');
  const [newAmenityType, setNewAmenityType] = useState<'PER_USER' | 'FLAT_EVENT'>('PER_USER');
  const [newBasePrice, setNewBasePrice] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const router = useRouter();

  const fetchAmenities = async () => {
    try {
      const { userData } = await getAuthData();
      setUserRole(userData?.role || 'resident');
      const res = await apiGetUserSocieties(userData.id);
      if (res.success && res.result.length > 0) {
        const sId = res.result[0]._id;
        setSocietyId(sId);
        const amenityRes = await AmenityService.getAmenities(sId);
        if (amenityRes.success) {
          setAmenities(amenityRes.result);
        }
      }
    } catch (error) {
      console.error("Error fetching amenities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmenities();
  }, []);

  const createAmenity = async () => {
    if (!newAmenityName.trim() || !newBasePrice.trim()) {
      Alert.alert('Validation', 'Name and base price are required.');
      return;
    }

    try {
      const res = await AmenityService.createAmenity({
        name: newAmenityName.trim(),
        type: newAmenityType,
        base_price: Number(newBasePrice),
        max_capacity: Number(newCapacity || '1'),
        society_id: societyId,
      });

      if (res.success) {
        setCreateModalVisible(false);
        setNewAmenityName('');
        setNewBasePrice('');
        setNewCapacity('');
        setNewAmenityType('PER_USER');
        fetchAmenities();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create amenity.');
    }
  };

  useEffect(() => {
    if (selectedAmenity) {
      if (selectedAmenity.type === 'PER_USER') {
        setTotalPrice(selectedAmenity.base_price * (parseInt(guestCount) || 1));
      } else {
        setTotalPrice(selectedAmenity.base_price * (parseInt(bookingHours) || 1));
      }
    }
  }, [guestCount, bookingHours, selectedAmenity]);

  const handleBookPress = (amenity: Amenity) => {
    setSelectedAmenity(amenity);
    setBookingModalVisible(true);
  };

  const submitBooking = async () => {
    if (!selectedAmenity) return;
    try {
      const startTime = new Date();
      const endTime = new Date();
      if (selectedAmenity.type === 'FLAT_EVENT') {
        endTime.setHours(startTime.getHours() + (parseInt(bookingHours) || 1));
      } else {
        endTime.setHours(startTime.getHours() + 1); // Default 1 hour for per-user
      }

      const res = await AmenityService.bookAmenity({
        amenity_id: selectedAmenity._id,
        society_id: societyId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        guest_count: parseInt(guestCount) || 1
      });

      if (res.success) {
        Alert.alert("Success", "Booking request submitted!");
        setBookingModalVisible(false);
        router.push('/amenity-bookings');
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to book.");
    }
  };

  const renderAmenityCard = ({ item }: { item: Amenity }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.amenityIconBox}>
          <Ionicons name={item.name.toLowerCase().includes('pool') ? 'water' : 'business'} size={24} color="#4f46e5" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{item.type === 'PER_USER' ? 'Per Person' : 'Flat Event Rate'}</Text>
          </View>
        </View>
        <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>From</Text>
            <Text style={styles.priceValue}>${item.base_price}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.bookBtn} onPress={() => handleBookPress(item)}>
        <Text style={styles.bookBtnText}>Book Now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#f8fafc' }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Society Amenities</Text>
        <View style={styles.headerActions}>
          {userRole === 'admin' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModalVisible(true)}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.historyBtn} onPress={() => router.push('/amenity-bookings')}>
            <Ionicons name="calendar-outline" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={amenities}
          renderItem={renderAmenityCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={60} color="#cbd5e1" />
              <Text style={styles.emptyText}>No amenities defined.</Text>
            </View>
          }
          onRefresh={fetchAmenities}
          refreshing={loading}
        />
      )}

      {/* Booking Modal */}
      <Modal visible={bookingModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <Pressable style={styles.modalOverlay} onPress={() => setBookingModalVisible(false)}>
                <View style={styles.modalContainer} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Book {selectedAmenity?.name}</Text>
                        <TouchableOpacity onPress={() => setBookingModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#1e293b" />
                        </TouchableOpacity>
                    </View>
                    
                    {selectedAmenity?.type === 'PER_USER' ? (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Number of Guests</Text>
                        <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        value={guestCount}
                        onChangeText={setGuestCount}
                        />
                    </View>
                    ) : (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Booking Duration (Hours)</Text>
                        <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        value={bookingHours}
                        onChangeText={setBookingHours}
                        />
                    </View>
                    )}

                    <View style={styles.priceBreakdown}>
                    <Text style={styles.priceBreakdownLabel}>Total Estimated Price</Text>
                    <Text style={styles.priceBreakdownValue}>${totalPrice}</Text>
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={submitBooking}>
                        <Text style={styles.submitBtnText}>Confirm Booking</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Amenity Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <Pressable style={styles.modalOverlay} onPress={() => setCreateModalVisible(false)}>
                <View style={styles.modalContainer} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Create Amenity</Text>
                        <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#1e293b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={styles.label}>Amenity Name</Text>
                        <TextInput
                        style={styles.modalInput}
                        value={newAmenityName}
                        onChangeText={setNewAmenityName}
                        placeholder="e.g. Swimming Pool"
                        />

                        <Text style={styles.label}>Pricing Model</Text>
                        <View style={styles.typeSwitchRow}>
                        <TouchableOpacity
                            style={[styles.typeSwitchBtn, newAmenityType === 'PER_USER' && styles.typeSwitchBtnActive]}
                            onPress={() => setNewAmenityType('PER_USER')}
                        >
                            <Text style={[styles.typeSwitchText, newAmenityType === 'PER_USER' && styles.typeSwitchTextActive]}>Per User</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeSwitchBtn, newAmenityType === 'FLAT_EVENT' && styles.typeSwitchBtnActive]}
                            onPress={() => setNewAmenityType('FLAT_EVENT')}
                        >
                            <Text style={[styles.typeSwitchText, newAmenityType === 'FLAT_EVENT' && styles.typeSwitchTextActive]}>Flat Rate</Text>
                        </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Base Price ($)</Text>
                        <TextInput
                        style={styles.modalInput}
                        value={newBasePrice}
                        onChangeText={setNewBasePrice}
                        placeholder="0.00"
                        keyboardType="numeric"
                        />
                        
                        <Text style={styles.label}>Max Capacity</Text>
                        <TextInput
                        style={styles.modalInput}
                        value={newCapacity}
                        onChangeText={setNewCapacity}
                        placeholder="1"
                        keyboardType="numeric"
                        />

                        <TouchableOpacity style={styles.submitBtn} onPress={createAmenity}>
                            <Text style={styles.submitBtnText}>Save Amenity</Text>
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
  
  listContainer: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  amenityIconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  typeBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  typeText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  priceBox: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' },
  priceValue: { fontSize: 20, fontWeight: '800', color: '#4f46e5' },
  
  bookBtn: { backgroundColor: '#4f46e5', alignItems: 'center', paddingVertical: 14, borderRadius: 16, shadowColor: '#4f46e5', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#94a3b8', fontWeight: '500' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4 },
  modalInput: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, fontSize: 16, color: '#1e293b', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  
  priceBreakdown: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  priceBreakdownLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  priceBreakdownValue: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  
  submitBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#4f46e5', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  typeSwitchRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeSwitchBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  typeSwitchBtnActive: { backgroundColor: '#eef2ff', borderColor: '#4f46e5' },
  typeSwitchText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  typeSwitchTextActive: { color: '#4f46e5' },
});
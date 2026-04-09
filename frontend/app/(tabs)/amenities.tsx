import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { getAuthData } from '@/hooks/helperHooks';
import AmenityService, { Amenity } from '@/services/AmenityService';
import { apiGetUserSocieties } from '@/services/SocietyService';

export default function AmenitiesScreen() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [societyId, setSocietyId] = useState('');
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [guestCount, setGuestCount] = useState('1');
  const [bookingHours, setBookingHours] = useState('1');
  const [totalPrice, setTotalPrice] = useState(0);
  const router = useRouter();

  const fetchAmenities = async () => {
    try {
      const { userData } = await getAuthData();
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
      <View style={styles.cardHeader}>
        <View style={styles.amenityIcon}>
          <Ionicons name={item.name.toLowerCase().includes('pool') ? 'water' : 'business'} size={24} color="#4f46e5" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.type}>{item.type === 'PER_USER' ? 'Per Person' : 'Flat Event Rate'}</Text>
        </View>
        <Text style={styles.price}>${item.base_price}</Text>
      </View>
      <TouchableOpacity style={styles.bookButton} onPress={() => handleBookPress(item)}>
        <Text style={styles.bookButtonText}>Book Now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Society Amenities</Text>
        <TouchableOpacity onPress={() => router.push('/amenity-bookings')}>
          <Ionicons name="calendar-outline" size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={amenities}
          renderItem={renderAmenityCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No amenities defined.</Text>
            </View>
          }
          onRefresh={fetchAmenities}
          refreshing={loading}
        />
      )}

      <Modal visible={bookingModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Book {selectedAmenity?.name}</Text>
            
            {selectedAmenity?.type === 'PER_USER' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Number of Guests</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={guestCount}
                  onChangeText={setGuestCount}
                />
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Booking Duration (Hours)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={bookingHours}
                  onChangeText={setBookingHours}
                />
              </View>
            )}

            <View style={styles.priceBreakdown}>
              <Text style={styles.priceLabel}>Estimated Price:</Text>
              <Text style={styles.priceValue}>${totalPrice}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setBookingModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={submitBooking}>
                <Text style={styles.submitButtonText}>Confirm Booking</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#333' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  amenityIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: '#333' },
  type: { fontSize: 12, color: '#666' },
  price: { fontSize: 20, fontWeight: '700', color: '#4f46e5' },
  bookButton: { backgroundColor: '#4f46e5', alignItems: 'center', paddingVertical: 12, borderRadius: 8 },
  bookButtonText: { color: '#fff', fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '85%', padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  priceBreakdown: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#f9fafb', borderRadius: 8, marginBottom: 20 },
  priceLabel: { fontWeight: '600', color: '#333' },
  priceValue: { fontWeight: '700', color: '#4f46e5', fontSize: 18 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#666', fontWeight: '600' },
  submitButton: { flex: 2, backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: '700' }
});

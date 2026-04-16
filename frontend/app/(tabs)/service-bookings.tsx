import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import ServiceProviderService, { ServiceBooking } from '@/services/ServiceProviderService';
import { getAuthData } from '@/hooks/helperHooks';

export default function ServiceBookingsScreen() {
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalVisible, setReviewModalModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ServiceBooking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewedProviderIds, setReviewedProviderIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const fetchBookings = async () => {
    try {
      const { userData } = await getAuthData();

      const res = await ServiceProviderService.getUserBookings();
      if (res.success) {
        setBookings(res.result);

        const completedProviderIds = Array.from(
          new Set(
            res.result
              .filter((b) => b.status === 'COMPLETED')
              .map((b) => b.provider_id._id)
          )
        );

        const reviewed = new Set<string>();
        await Promise.all(
          completedProviderIds.map(async (providerId) => {
            try {
              const reviewRes = await ServiceProviderService.getReviews(providerId);
              if (reviewRes.success && reviewRes.result.some((r) => r.user_id._id === userData.id)) {
                reviewed.add(providerId);
              }
            } catch {
              // Ignore review fetch failures and keep UI usable.
            }
          })
        );

        setReviewedProviderIds(reviewed);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleComplete = async (id: string) => {
    try {
      const res = await ServiceProviderService.updateBookingStatus(id, 'COMPLETED');
      if (res.success) {
        Alert.alert("Success", "Service marked as completed!");
        fetchBookings();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update status.");
    }
  };

  const handleReview = (booking: ServiceBooking) => {
    setSelectedBooking(booking);
    setReviewModalModalVisible(true);
  };

  const submitReview = async () => {
    if (!selectedBooking) return;
    try {
      const res = await ServiceProviderService.addReview(selectedBooking.provider_id._id, {
        rating,
        comment
      });
      if (res.success) {
        Alert.alert("Success", "Review submitted!");
        setReviewModalModalVisible(false);
        setComment('');
        setRating(5);
        fetchBookings();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit review.");
    }
  };

  const renderBookingCard = ({ item }: { item: ServiceBooking }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.providerName}>{item.provider_id.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? '#C8E6C9' : item.status === 'CANCELLED' ? '#FFCDD2' : '#BBDEFB' }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.dateText}>Date: {new Date(item.date).toLocaleDateString()}</Text>
      
      <View style={styles.actions}>
        {item.status === 'PENDING' && (
          <TouchableOpacity style={styles.completeButton} onPress={() => handleComplete(item._id)}>
            <Text style={styles.buttonText}>Mark Completed</Text>
          </TouchableOpacity>
        )}
        {item.status === 'COMPLETED' && !reviewedProviderIds.has(item.provider_id._id) && (
          <TouchableOpacity style={styles.reviewButton} onPress={() => handleReview(item)}>
            <Text style={styles.reviewButtonText}>Leave Review</Text>
          </TouchableOpacity>
        )}
        {item.status === 'COMPLETED' && reviewedProviderIds.has(item.provider_id._id) && (
          <View style={styles.reviewDonePill}>
            <Text style={styles.reviewDonePillText}>Review Submitted</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No bookings found.</Text>
            </View>
          }
          onRefresh={fetchBookings}
          refreshing={loading}
        />
      )}

      <Modal visible={reviewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Service</Text>
            <Text style={styles.modalSubtitle}>How was your experience with {selectedBooking?.provider_id.name}?</Text>
            
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Ionicons name={s <= rating ? "star" : "star-outline"} size={32} color="#fbbf24" />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Write a comment (optional)..."
              multiline
              value={comment}
              onChangeText={setComment}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setReviewModalModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={submitReview}>
                <Text style={styles.submitButtonText}>Submit</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  providerName: { fontSize: 18, fontWeight: '700', color: '#333' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  dateText: { color: '#666', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12 },
  completeButton: { backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  reviewButton: { borderWidth: 1, borderColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  reviewButtonText: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
  reviewDonePill: { backgroundColor: '#ecfdf5', borderColor: '#34d399', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  reviewDonePillText: { color: '#047857', fontWeight: '600', fontSize: 13 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#999' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '85%', padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  reviewInput: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#eee', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#666', fontWeight: '600' },
  submitButton: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: '700' }
});

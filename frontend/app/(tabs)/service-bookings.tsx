import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, TextInput, Modal, KeyboardAvoidingView, Pressable, ScrollView, Platform } from 'react-native';
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

  const handleApiError = (error: any, fallbackMessage: string) => {
    if (error?.isAuthError || error?.statusCode === 401) {
      Alert.alert('Session Expired', 'Please log in again.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    if (error?.message?.toLowerCase?.().includes('access denied')) {
      Alert.alert('Access Denied', error.message);
      return;
    }

    Alert.alert('Error', error?.message || fallbackMessage);
  };

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
    } catch (error: any) {
      handleApiError(error, 'Failed to fetch service bookings.');
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
      handleApiError(error, 'Failed to update status.');
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
      handleApiError(error, 'Failed to submit review.');
    }
  };

  const renderBookingCard = ({ item }: { item: ServiceBooking }) => {
    const statusColor = item.status === 'COMPLETED' ? '#059669' : item.status === 'CANCELLED' ? '#dc2626' : '#2563eb';
    const statusBg = item.status === 'COMPLETED' ? '#dcfce7' : item.status === 'CANCELLED' ? '#fef2f2' : '#dbeafe';

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.providerName}>{item.provider_id.name}</Text>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={12} color="#64748b" />
                        <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                </View>
            </View>
            
            <View style={styles.actions}>
                {item.status === 'PENDING' && (
                <TouchableOpacity style={styles.completeButton} onPress={() => handleComplete(item._id)}>
                    <Ionicons name="checkmark-done" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.buttonText}>Complete</Text>
                </TouchableOpacity>
                )}
                {item.status === 'COMPLETED' && !reviewedProviderIds.has(item.provider_id._id) && (
                <TouchableOpacity style={styles.reviewButton} onPress={() => handleReview(item)}>
                    <Ionicons name="star-outline" size={16} color="#4f46e5" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewButtonText}>Rate Service</Text>
                </TouchableOpacity>
                )}
                {item.status === 'COMPLETED' && reviewedProviderIds.has(item.provider_id._id) && (
                <View style={styles.reviewDonePill}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewDonePillText}>Reviewed</Text>
                </View>
                )}
            </View>
        </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#f8fafc' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
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
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={60} color="#cbd5e1" />
              <Text style={styles.emptyText}>No service bookings yet.</Text>
            </View>
          }
          onRefresh={fetchBookings}
          refreshing={loading}
        />
      )}

      <Modal visible={reviewModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={24}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setReviewModalModalVisible(false)}>
            <View style={styles.modalContainer} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Rate Experience</Text>
                  <TouchableOpacity onPress={() => setReviewModalModalVisible(false)}>
                      <Ionicons name="close" size={24} color="#1e293b" />
                  </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.modalSubtitle}>How was your experience with {selectedBooking?.provider_id.name}?</Text>

                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.7}>
                      <Ionicons name={s <= rating ? "star" : "star-outline"} size={40} color="#fbbf24" />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.reviewInput}
                  placeholder="Tell us more about the service..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  value={comment}
                  onChangeText={setComment}
                />

                <TouchableOpacity style={styles.submitBtn} onPress={submitReview}>
                    <Text style={styles.submitBtnText}>Submit Feedback</Text>
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
    alignItems: 'center', 
    padding: 24, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#f8fafc', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  providerName: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  actions: { flexDirection: 'row', gap: 12 },
  completeButton: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  reviewButton: { flex: 1, borderWidth: 1.5, borderColor: '#4f46e5', paddingVertical: 12, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  reviewButtonText: { color: '#4f46e5', fontWeight: '700', fontSize: 14 },
  reviewDonePill: { flex: 1, backgroundColor: '#f0fdf4', paddingVertical: 12, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: '#dcfce7' },
  reviewDonePillText: { color: '#059669', fontWeight: '700', fontSize: 14 },
  
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#94a3b8', fontWeight: '500' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  modalScrollContent: { paddingBottom: 24 },
  modalSubtitle: { fontSize: 15, color: '#64748b', marginBottom: 24, lineHeight: 22 },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 30 },
  reviewInput: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, height: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24, color: '#1e293b', fontSize: 15 },
  submitBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});

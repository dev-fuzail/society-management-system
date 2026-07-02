import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, TextInput, Modal, KeyboardAvoidingView, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import ServiceProviderService, { ServiceBooking } from '@/services/ServiceProviderService';
import { getAuthData } from '@/hooks/helperHooks';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

export default function ServiceBookingsScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
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
      Alert.alert('Session Expired', 'Please log in again.', [{ text: 'OK', onPress: () => router.replace('/login') }]);
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
        const completedProviderIds = Array.from(new Set(res.result.filter((b) => b.status === 'COMPLETED').map((b) => b.provider_id._id)));
        const reviewed = new Set<string>();
        await Promise.all(completedProviderIds.map(async (providerId) => {
          try {
            const reviewRes = await ServiceProviderService.getReviews(providerId);
            if (reviewRes.success && reviewRes.result.some((r) => r.user_id._id === userData.id)) reviewed.add(providerId);
          } catch {}
        }));
        setReviewedProviderIds(reviewed);
      }
    } catch (error: any) { handleApiError(error, 'Failed to fetch service bookings.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleComplete = async (id: string) => {
    try {
      const res = await ServiceProviderService.updateBookingStatus(id, 'COMPLETED');
      if (res.success) { Alert.alert("Success", "Service marked as completed!"); fetchBookings(); }
    } catch (error: any) { handleApiError(error, 'Failed to update status.'); }
  };

  const handleReview = (booking: ServiceBooking) => { setSelectedBooking(booking); setReviewModalModalVisible(true); };

  const submitReview = async () => {
    if (!selectedBooking) return;
    try {
      const res = await ServiceProviderService.addReview(selectedBooking.provider_id._id, { rating, comment });
      if (res.success) {
        Alert.alert("Success", "Review submitted!"); setReviewModalModalVisible(false); setComment(''); setRating(5); fetchBookings();
      }
    } catch (error: any) { handleApiError(error, 'Failed to submit review.'); }
  };

  const getStatusMeta = (status: string) => ({
    COMPLETED: { color: theme.successText, bg: theme.successLight },
    CANCELLED: { color: theme.dangerText, bg: theme.dangerLight },
    PENDING:   { color: theme.infoText, bg: theme.infoLight },
  }[status] ?? { color: theme.textSecondary, bg: theme.surfaceSubtle });

  const renderBookingCard = ({ item }: { item: ServiceBooking }) => {
    const meta = getStatusMeta(item.status);
    return (
      <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[s.providerName, { color: theme.text }]}>{item.provider_id.name}</Text>
            <View style={s.dateRow}>
              <Ionicons name="calendar-outline" size={12} color={theme.textMuted} />
              <Text style={[s.dateText, { color: theme.textSecondary }]}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
          </View>
          <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[s.statusText, { color: meta.color }]}>{item.status}</Text>
          </View>
        </View>
        <View style={s.actions}>
          {item.status === 'PENDING' && (
            <TouchableOpacity style={[s.completeBtn, { backgroundColor: theme.primary }]} onPress={() => handleComplete(item._id)}>
              <Ionicons name="checkmark-done" size={16} color="#fff" />
              <Text style={s.completeBtnText}>Complete</Text>
            </TouchableOpacity>
          )}
          {item.status === 'COMPLETED' && !reviewedProviderIds.has(item.provider_id._id) && (
            <TouchableOpacity style={[s.reviewBtn, { borderColor: theme.primary }]} onPress={() => handleReview(item)}>
              <Ionicons name="star-outline" size={16} color={theme.primary} />
              <Text style={[s.reviewBtnText, { color: theme.primary }]}>Rate Service</Text>
            </TouchableOpacity>
          )}
          {item.status === 'COMPLETED' && reviewedProviderIds.has(item.provider_id._id) && (
            <View style={[s.reviewedPill, { backgroundColor: theme.successLight, borderColor: '#86efac' }]}>
              <Ionicons name="checkmark-circle" size={16} color={theme.successText} />
              <Text style={[s.reviewedText, { color: theme.successText }]}>Reviewed</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={[s.header, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderLight }]}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>My Bookings</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="calendar-outline" size={36} color={theme.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: theme.text }]}>No bookings yet</Text>
              <Text style={[s.emptyMsg, { color: theme.textMuted }]}>Your service bookings will appear here.</Text>
            </View>
          }
          onRefresh={fetchBookings}
          refreshing={loading}
        />
      )}

      <Modal visible={reviewModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={24} style={{ flex: 1 }}>
          <Pressable style={s.overlay} onPress={() => setReviewModalModalVisible(false)}>
            <View style={[s.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <View style={s.sheetHandle} />
              <View style={s.sheetHeader}>
                <Text style={[s.sheetTitle, { color: theme.text }]}>Rate Experience</Text>
                <TouchableOpacity onPress={() => setReviewModalModalVisible(false)} style={[s.closeBtn, { backgroundColor: theme.surfaceSubtle }]}>
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={[s.sheetSubtitle, { color: theme.textSecondary }]}>How was your experience with {selectedBooking?.provider_id.name}?</Text>
                <View style={s.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                      <Ionicons name={star <= rating ? "star" : "star-outline"} size={40} color="#fbbf24" />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={[s.reviewInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} placeholder="Tell us more about the service..." placeholderTextColor={theme.textMuted} multiline value={comment} onChangeText={setComment} />
                <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.primary }]} onPress={submitReview}>
                  <Text style={s.submitBtnText}>Submit Feedback</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
    backBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    listContent: { padding: 16, paddingBottom: 40 },
    card: { borderRadius: 22, padding: 18, marginBottom: 14, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    providerName: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dateText: { fontSize: 13, fontWeight: '500' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    actions: { flexDirection: 'row', gap: 10 },
    completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12 },
    completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    reviewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, paddingVertical: 12, borderRadius: 12 },
    reviewBtnText: { fontWeight: '700', fontSize: 14 },
    reviewedPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
    reviewedText: { fontWeight: '700', fontSize: 14 },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '80%' },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 16 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    sheetTitle: { fontSize: 20, fontWeight: '800' },
    sheetSubtitle: { fontSize: 14, lineHeight: 21, marginBottom: 22 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 },
    reviewInput: { borderRadius: 14, padding: 14, height: 110, textAlignVertical: 'top', borderWidth: 1, marginBottom: 22, fontSize: 14 },
    submitBtn: { padding: 16, borderRadius: 14, alignItems: 'center' },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}

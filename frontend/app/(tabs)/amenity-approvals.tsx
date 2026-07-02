import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AmenityService, { AmenityBooking } from '@/services/AmenityService';
import { getAuthData } from '@/hooks/helperHooks';
import { apiGetUserSocieties } from '@/services/SocietyService';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

export default function AmenityApprovalsScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<AmenityBooking[]>([]);
  const [societyId, setSocietyId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const pendingBookings = useMemo(() => bookings.filter((b) => b.status === 'PENDING'), [bookings]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { userData } = await getAuthData();
      const admin = userData?.role === 'admin';
      setIsAdmin(admin);
      if (!admin) {
        Alert.alert('Access Denied', 'Only admins can access amenity approvals.', [{ text: 'OK', onPress: () => router.back() }]);
        return;
      }
      const societiesRes = await apiGetUserSocieties(userData.id);
      if (!societiesRes.success || societiesRes.result.length === 0) { setBookings([]); return; }
      const currentSocietyId = societiesRes.result[0]._id;
      setSocietyId(currentSocietyId);
      const bookingsRes = await AmenityService.getBookings(currentSocietyId);
      if (bookingsRes.success) setBookings(bookingsRes.result);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load amenity approvals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (bookingId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await AmenityService.updateBookingStatus(bookingId, status);
      if (res.success) { Alert.alert('Success', `Booking ${status.toLowerCase()} successfully.`); fetchBookings(); }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update booking status.');
    }
  };

  const renderBookingCard = ({ item }: { item: AmenityBooking }) => (
    <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={s.cardHeader}>
        <Text style={[s.amenityName, { color: theme.text }]}>{item.amenity_id?.name || 'Amenity'}</Text>
        <View style={[s.pendingBadge, { backgroundColor: theme.warningLight }]}>
          <Text style={[s.pendingText, { color: theme.warningText }]}>PENDING</Text>
        </View>
      </View>

      {[
        { icon: 'person-outline' as const, text: item.user_id?.name || 'Unknown User', color: theme.primary },
        ...(item.start_time && item.end_time
          ? [
              { icon: 'calendar-outline' as const, text: new Date(item.start_time).toLocaleString(), color: theme.success },
              { icon: 'calendar-clear-outline' as const, text: new Date(item.end_time).toLocaleString(), color: theme.danger },
            ]
          : [{ icon: 'time-outline' as const, text: 'Anytime access (recurring)', color: theme.success }]),
        { icon: 'people-outline' as const, text: `${item.guest_count} guests`, color: theme.textSecondary },
      ].map(({ icon, text, color }) => (
        <View key={icon + text} style={s.detailRow}>
          <Ionicons name={icon} size={14} color={color} />
          <Text style={[s.detailText, { color: theme.textSecondary }]}>{text}</Text>
        </View>
      ))}

      {item.calculated_price > 0 && (
        <View style={s.detailRow}>
          <Ionicons name="card-outline" size={14} color={theme.success} />
          <Text style={[s.detailText, { color: theme.successText, fontWeight: '700' }]}>PKR {item.calculated_price.toLocaleString('en-PK')}</Text>
        </View>
      )}

      <View style={s.actionsRow}>
        <TouchableOpacity style={[s.rejectBtn, { backgroundColor: theme.dangerLight, borderColor: '#fecaca' }]} onPress={() => updateStatus(item._id, 'REJECTED')}>
          <Ionicons name="close-circle-outline" size={16} color={theme.dangerText} />
          <Text style={[s.rejectBtnText, { color: theme.dangerText }]}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.approveBtn, { backgroundColor: theme.successLight, borderColor: '#86efac' }]} onPress={() => updateStatus(item._id, 'APPROVED')}>
          <Ionicons name="checkmark-circle-outline" size={16} color={theme.successText} />
          <Text style={[s.approveBtnText, { color: theme.successText }]}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isAdmin && !loading) return <View style={[s.container, { backgroundColor: theme.bg }]} />;

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={[s.header, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: theme.surfaceSubtle }]}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.text }]}>Amenity Approvals</Text>
        {pendingBookings.length > 0 && (
          <View style={[s.countBadge, { backgroundColor: theme.warning }]}>
            <Text style={s.countText}>{pendingBookings.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={pendingBookings}
          keyExtractor={(item) => item._id}
          renderItem={renderBookingCard}
          contentContainerStyle={s.listContent}
          refreshing={loading}
          onRefresh={fetchBookings}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: theme.successLight }]}>
                <Ionicons name="checkmark-done-circle-outline" size={36} color={theme.successText} />
              </View>
              <Text style={[s.emptyTitle, { color: theme.text }]}>All caught up!</Text>
              <Text style={[s.emptyMsg, { color: theme.textMuted }]}>No pending amenity approvals at this time.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
    backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    headerTitle: { fontSize: 20, fontWeight: '800', flex: 1 },
    countBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    countText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    listContent: { padding: 16, paddingBottom: 28 },
    card: { borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    amenityName: { fontSize: 16, fontWeight: '700' },
    pendingBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    pendingText: { fontWeight: '700', fontSize: 10, letterSpacing: 0.4 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    detailText: { fontSize: 13, fontWeight: '500' },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 12 },
    rejectBtnText: { fontWeight: '700', fontSize: 14 },
    approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 12 },
    approveBtnText: { fontWeight: '700', fontSize: 14 },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  });
}

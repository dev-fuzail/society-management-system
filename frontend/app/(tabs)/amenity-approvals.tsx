import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AmenityService, { AmenityBooking } from '@/services/AmenityService';
import { getAuthData } from '@/hooks/helperHooks';
import { apiGetUserSocieties } from '@/services/SocietyService';

export default function AmenityApprovalsScreen() {
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
        Alert.alert('Access Denied', 'Only admins can access amenity approvals.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      const societiesRes = await apiGetUserSocieties(userData.id);
      if (!societiesRes.success || societiesRes.result.length === 0) {
        setBookings([]);
        return;
      }

      const currentSocietyId = societiesRes.result[0]._id;
      setSocietyId(currentSocietyId);

      const bookingsRes = await AmenityService.getBookings(currentSocietyId);
      if (bookingsRes.success) {
        setBookings(bookingsRes.result);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load amenity approvals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateStatus = async (bookingId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await AmenityService.updateBookingStatus(bookingId, status);
      if (res.success) {
        Alert.alert('Success', `Booking ${status.toLowerCase()} successfully.`);
        fetchBookings();
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update booking status.');
    }
  };

  const renderBookingCard = ({ item }: { item: AmenityBooking }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.amenityName}>{item.amenity_id?.name || 'Amenity'}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>PENDING</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="person-outline" size={14} color="#4f46e5" />
        <Text style={styles.detailText}>{item.user_id?.name || 'Unknown User'}</Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={14} color="#059669" />
        <Text style={styles.detailText}>{new Date(item.start_time).toLocaleString()}</Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="calendar-clear-outline" size={14} color="#dc2626" />
        <Text style={styles.detailText}>{new Date(item.end_time).toLocaleString()}</Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="people-outline" size={14} color="#475569" />
        <Text style={styles.detailText}>{item.guest_count} guests</Text>
      </View>

      {item.calculated_price > 0 && (
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={14} color="#059669" />
          <Text style={[styles.detailText, { fontWeight: '700', color: '#059669' }]}>
            PKR {item.calculated_price.toLocaleString('en-PK')}
          </Text>
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => updateStatus(item._id, 'REJECTED')}>
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveBtn} onPress={() => updateStatus(item._id, 'APPROVED')}>
          <Text style={styles.approveBtnText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isAdmin && !loading) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Amenity Approvals</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={pendingBookings}
          keyExtractor={(item) => item._id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={fetchBookings}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color="#94a3b8" />
              <Text style={styles.emptyText}>No pending amenity approvals.</Text>
              {Boolean(societyId) && <Text style={styles.emptyHint}>Society: {societyId.slice(-6).toUpperCase()}</Text>}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#fff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  list: { padding: 16, paddingBottom: 28 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  amenityName: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  statusBadge: { backgroundColor: '#fef3c7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#b45309', fontWeight: '700', fontSize: 11 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailText: { color: '#475569', fontSize: 14, fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rejectBtnText: { color: '#b91c1c', fontWeight: '700' },
  approveBtn: {
    flex: 1,
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  approveBtnText: { color: '#15803d', fontWeight: '700' },
  emptyState: { marginTop: 80, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16, color: '#64748b', fontWeight: '600' },
  emptyHint: { marginTop: 6, fontSize: 12, color: '#94a3b8' },
});

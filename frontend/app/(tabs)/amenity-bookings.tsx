import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import AmenityService, { AmenityBooking } from '@/services/AmenityService';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

export default function AmenityBookingsScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [bookings, setBookings] = useState<AmenityBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchBookings = async () => {
    try {
      const res = await AmenityService.getBookings();
      if (res.success) setBookings(res.result);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const getStatusMeta = (status: string) => ({
    APPROVED: { color: theme.successText, bg: theme.successLight },
    REJECTED: { color: theme.dangerText, bg: theme.dangerLight },
    PENDING: { color: theme.warningText, bg: theme.warningLight },
  }[status] ?? { color: theme.textSecondary, bg: theme.surfaceSubtle });

  const renderBookingCard = ({ item }: { item: AmenityBooking }) => {
    const meta = getStatusMeta(item.status);
    return (
      <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
        <View style={s.cardHeader}>
          <View style={s.headerInfo}>
            <Text style={[s.amenityName, { color: theme.text }]}>{item.amenity_id.name}</Text>
            <Text style={[s.bookingId, { color: theme.textMuted }]}>ID: {item._id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[s.statusText, { color: meta.color }]}>{item.status}</Text>
          </View>
        </View>
        <View style={s.details}>
          <View style={s.detailRow}>
            <View style={[s.iconCircle, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="calendar-outline" size={14} color={theme.primary} />
            </View>
            <Text style={[s.detailText, { color: theme.textSecondary }]}>{new Date(item.start_time).toLocaleString()}</Text>
          </View>
          <View style={s.detailRow}>
            <View style={[s.iconCircle, { backgroundColor: theme.successLight }]}>
              <Ionicons name="people-outline" size={14} color={theme.successText} />
            </View>
            <Text style={[s.detailText, { color: theme.textSecondary }]}>{item.guest_count} Guests</Text>
          </View>
          <View style={s.detailRow}>
            <View style={[s.iconCircle, { backgroundColor: theme.warningLight }]}>
              <Ionicons name="card-outline" size={14} color={theme.warningText} />
            </View>
            <Text style={[s.detailText, { color: theme.textSecondary }]}>
              Amount: <Text style={[s.priceText, { color: theme.text }]}>PKR {item.calculated_price.toLocaleString('en-PK')}</Text>
            </Text>
          </View>
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
        <Text style={[s.headerTitle, { color: theme.text }]}>Amenity History</Text>
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
              <Text style={[s.emptyMsg, { color: theme.textMuted }]}>Your amenity booking history will appear here.</Text>
            </View>
          }
          onRefresh={fetchBookings}
          refreshing={loading}
        />
      )}
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
    headerInfo: { flex: 1 },
    amenityName: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
    bookingId: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    details: { gap: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconCircle: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    detailText: { fontSize: 14, fontWeight: '500' },
    priceText: { fontWeight: '800' },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  });
}

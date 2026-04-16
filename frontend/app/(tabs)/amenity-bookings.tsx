import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import AmenityService, { AmenityBooking } from '@/services/AmenityService';

export default function AmenityBookingsScreen() {
  const [bookings, setBookings] = useState<AmenityBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchBookings = async () => {
    try {
      const res = await AmenityService.getBookings();
      if (res.success) {
        setBookings(res.result);
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

  const renderBookingCard = ({ item }: { item: AmenityBooking }) => {
    const statusColor = item.status === 'APPROVED' ? '#059669' : item.status === 'REJECTED' ? '#dc2626' : '#d97706';
    const statusBg = item.status === 'APPROVED' ? '#dcfce7' : item.status === 'REJECTED' ? '#fef2f2' : '#fef3c7';

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.headerInfo}>
                    <Text style={styles.amenityName}>{item.amenity_id.name}</Text>
                    <Text style={styles.bookingId}>ID: {item._id.slice(-6).toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                </View>
            </View>
            
            <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="calendar-outline" size={14} color="#4f46e5" />
                    </View>
                    <Text style={styles.detailText}>{new Date(item.start_time).toLocaleString()}</Text>
                </View>
                <View style={styles.detailRow}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="people-outline" size={14} color="#059669" />
                    </View>
                    <Text style={styles.detailText}>{item.guest_count} Guests</Text>
                </View>
                <View style={styles.detailRow}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="card-outline" size={14} color="#f97316" />
                    </View>
                    <Text style={styles.detailText}>Amount: <Text style={styles.priceText}>${item.calculated_price}</Text></Text>
                </View>
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
        <Text style={styles.headerTitle}>Amenity History</Text>
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
              <Text style={styles.emptyText}>No booking history found.</Text>
            </View>
          }
          onRefresh={fetchBookings}
          refreshing={loading}
        />
      )}
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
  headerInfo: { flex: 1 },
  amenityName: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  bookingId: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  detailsContainer: { gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  detailText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  priceText: { color: '#1e293b', fontWeight: '800' },
  
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#94a3b8', fontWeight: '500' }
});
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, TextInput, Modal, ScrollView, KeyboardAvoidingView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { getAuthData } from '@/hooks/helperHooks';
import AmenityService, { Amenity } from '@/services/AmenityService';
import { apiGetUserSocieties } from '@/services/SocietyService';
import CalendarModal from '@/components/CalendarModal';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

export default function AmenitiesScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('resident');
  const [societyId, setSocietyId] = useState('');
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [guestCount, setGuestCount] = useState('1');
  const [bookingStartDate, setBookingStartDate] = useState<Date>(new Date());
  const [bookingEndDate, setBookingEndDate] = useState<Date>(() => { const d = new Date(); d.setHours(d.getHours() + 1); return d; });
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [startTimeText, setStartTimeText] = useState('09:00');
  const [endTimeText, setEndTimeText] = useState('10:00');
  const [totalPrice, setTotalPrice] = useState(0);
  const [newAmenityName, setNewAmenityName] = useState('');
  const [newAmenityType, setNewAmenityType] = useState<'PER_USER' | 'FLAT_EVENT'>('PER_USER');
  const [newBasePrice, setNewBasePrice] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const router = useRouter();

  const formatTime = (date: Date) => `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;

  const applyTimeToDate = (baseDate: Date, timeText: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(timeText.trim());
    if (!m) return null;
    const hh = Number(m[1]); const mm = Number(m[2]);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    const updated = new Date(baseDate);
    updated.setHours(hh, mm, 0, 0);
    return updated;
  };

  const handleApiError = (error: any, fallbackMessage: string) => {
    if (error?.isAuthError || error?.statusCode === 401) {
      Alert.alert('Session Expired', 'Please log in again.', [{ text: 'OK', onPress: () => router.replace('/login') }]);
      return;
    }
    Alert.alert('Error', error?.message || fallbackMessage);
  };

  const fetchAmenities = async () => {
    try {
      const { userData } = await getAuthData();
      if (!userData?.id) { Alert.alert('Session Expired', 'Please log in again.', [{ text: 'OK', onPress: () => router.replace('/login') }]); return; }
      setUserRole(userData?.role || 'resident');
      const res = await apiGetUserSocieties(userData.id);
      if (res.success && res.result.length > 0) {
        const sId = res.result[0]._id;
        setSocietyId(sId);
        const amenityRes = await AmenityService.getAmenities(sId);
        if (amenityRes.success) setAmenities(amenityRes.result);
      }
    } catch (error: any) { handleApiError(error, 'Failed to load amenities.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAmenities(); }, []);

  const createAmenity = async () => {
    if (!newAmenityName.trim() || !newBasePrice.trim()) { Alert.alert('Validation', 'Name and base price are required.'); return; }
    try {
      const res = await AmenityService.createAmenity({ name: newAmenityName.trim(), type: newAmenityType, base_price: Number(newBasePrice), max_capacity: Number(newCapacity || '1'), society_id: societyId });
      if (res.success) {
        setCreateModalVisible(false); setNewAmenityName(''); setNewBasePrice(''); setNewCapacity(''); setNewAmenityType('PER_USER');
        fetchAmenities();
      }
    } catch (error: any) { handleApiError(error, 'Failed to create amenity.'); }
  };

  useEffect(() => {
    if (selectedAmenity) {
      setTotalPrice(selectedAmenity.type === 'PER_USER' ? selectedAmenity.base_price * (parseInt(guestCount) || 1) : selectedAmenity.base_price);
    }
  }, [guestCount, selectedAmenity]);

  const handleBookPress = (amenity: Amenity) => {
    setSelectedAmenity(amenity);
    const start = new Date(); const end = new Date(); end.setHours(end.getHours() + 1);
    setBookingStartDate(start); setBookingEndDate(end);
    setStartTimeText(formatTime(start)); setEndTimeText(formatTime(end));
    setShowStartCalendar(false); setShowEndCalendar(false);
    setBookingModalVisible(true);
  };

  const submitBooking = async () => {
    if (!selectedAmenity) return;
    const startAt = applyTimeToDate(bookingStartDate, startTimeText);
    const endAt = applyTimeToDate(bookingEndDate, endTimeText);
    if (!startAt || !endAt) { Alert.alert('Validation', 'Please enter time in HH:mm format.'); return; }
    if (endAt <= startAt) { Alert.alert('Validation', 'End date/time must be after start date/time.'); return; }
    try {
      const res = await AmenityService.bookAmenity({ amenity_id: selectedAmenity._id, society_id: societyId, start_time: startAt.toISOString(), end_time: endAt.toISOString(), guest_count: parseInt(guestCount) || 1 });
      if (res.success) { Alert.alert("Success", "Booking request submitted!"); setBookingModalVisible(false); router.push('/amenity-bookings'); }
    } catch (error: any) { handleApiError(error, 'Failed to submit booking.'); }
  };

  const getAmenityIcon = (name: string) => name.toLowerCase().includes('pool') ? 'water' : name.toLowerCase().includes('gym') ? 'barbell-outline' : name.toLowerCase().includes('hall') ? 'business-outline' : 'calendar-outline';

  const renderAmenityCard = ({ item }: { item: Amenity }) => (
    <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
      <View style={s.cardMain}>
        <View style={[s.amenityIconBox, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name={getAmenityIcon(item.name) as any} size={24} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.name, { color: theme.text }]}>{item.name}</Text>
          <View style={[s.typeBadge, { backgroundColor: theme.surfaceSubtle }]}>
            <Text style={[s.typeText, { color: theme.textSecondary }]}>{item.type === 'PER_USER' ? 'Recurring Facility' : 'One-Time Event'}</Text>
          </View>
        </View>
        <View style={s.priceBox}>
          <Text style={[s.priceLabel, { color: theme.textMuted }]}>From</Text>
          <Text style={[s.priceValue, { color: theme.primary }]}>PKR {item.base_price}</Text>
        </View>
      </View>
      <TouchableOpacity style={[s.bookBtn, { backgroundColor: theme.primary }]} onPress={() => handleBookPress(item)}>
        <Ionicons name="calendar-outline" size={16} color="#fff" />
        <Text style={s.bookBtnText}>Book Now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={[s.header, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}>
        <Text style={[s.headerTitle, { color: theme.text }]}>Society Amenities</Text>
        <View style={s.headerActions}>
          {userRole === 'admin' && (
            <TouchableOpacity style={[s.addBtn, { backgroundColor: theme.primary }]} onPress={() => setCreateModalVisible(true)}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.historyBtn, { backgroundColor: theme.primaryLight }]} onPress={() => router.push('/amenity-bookings')}>
            <Ionicons name="calendar-outline" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={amenities}
          renderItem={renderAmenityCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="gift-outline" size={36} color={theme.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: theme.text }]}>No amenities yet</Text>
              <Text style={[s.emptyMsg, { color: theme.textMuted }]}>Amenities will appear here once added by an admin.</Text>
            </View>
          }
          onRefresh={fetchAmenities}
          refreshing={loading}
        />
      )}

      {/* Booking Modal */}
      <Modal visible={bookingModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={24} style={{ flex: 1 }}>
          <Pressable style={s.overlay} onPress={() => setBookingModalVisible(false)}>
            <View style={[s.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <View style={s.sheetHandle} />
              <View style={s.sheetHeader}>
                <Text style={[s.sheetTitle, { color: theme.text }]}>Book {selectedAmenity?.name}</Text>
                <TouchableOpacity onPress={() => setBookingModalVisible(false)} style={[s.closeBtn, { backgroundColor: theme.surfaceSubtle }]}>
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={s.sheetContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {selectedAmenity?.type === 'PER_USER' && (
                  <>
                    <Text style={[s.label, { color: theme.textSecondary }]}>Number of Guests</Text>
                    <TextInput style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} keyboardType="numeric" value={guestCount} onChangeText={setGuestCount} />
                  </>
                )}

                <Text style={[s.label, { color: theme.textSecondary }]}>Start Date & Time</Text>
                <View style={s.dateTimeRow}>
                  <TouchableOpacity style={[s.input, s.dateBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]} onPress={() => setShowStartCalendar(true)}>
                    <Text style={[s.dateBtnText, { color: theme.text }]}>{bookingStartDate.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  <TextInput style={[s.input, s.timeInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} value={startTimeText} onChangeText={setStartTimeText} placeholder="HH:mm" placeholderTextColor={theme.textMuted} />
                </View>

                <Text style={[s.label, { color: theme.textSecondary }]}>End Date & Time</Text>
                <View style={s.dateTimeRow}>
                  <TouchableOpacity style={[s.input, s.dateBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]} onPress={() => setShowEndCalendar(true)}>
                    <Text style={[s.dateBtnText, { color: theme.text }]}>{bookingEndDate.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  <TextInput style={[s.input, s.timeInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} value={endTimeText} onChangeText={setEndTimeText} placeholder="HH:mm" placeholderTextColor={theme.textMuted} />
                </View>

                <View style={[s.priceBreakdown, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                  <Text style={[s.priceBreakdownLabel, { color: theme.textSecondary }]}>Total Estimated Price</Text>
                  <Text style={[s.priceBreakdownValue, { color: theme.text }]}>PKR {totalPrice}</Text>
                  <Text style={[s.bookingHint, { color: theme.textMuted }]}>
                    {selectedAmenity?.type === 'PER_USER' ? 'Recurring facilities can be booked in repeated slots.' : 'Event halls are treated as one-time bookings.'}
                  </Text>
                </View>

                <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.primary }]} onPress={submitBooking}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={s.submitBtnText}>Confirm Booking</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <CalendarModal visible={showStartCalendar} title="Select Start Date" initialDate={bookingStartDate} onClose={() => setShowStartCalendar(false)} onSelect={(date) => setBookingStartDate(date)} />
      <CalendarModal visible={showEndCalendar} title="Select End Date" initialDate={bookingEndDate} minDate={bookingStartDate} onClose={() => setShowEndCalendar(false)} onSelect={(date) => setBookingEndDate(date)} />

      {/* Create Amenity Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={s.overlay} onPress={() => setCreateModalVisible(false)}>
            <View style={[s.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <View style={s.sheetHandle} />
              <View style={s.sheetHeader}>
                <Text style={[s.sheetTitle, { color: theme.text }]}>Create Amenity</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={[s.closeBtn, { backgroundColor: theme.surfaceSubtle }]}>
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.sheetContent}>
                <Text style={[s.label, { color: theme.textSecondary }]}>Amenity Name</Text>
                <TextInput style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} value={newAmenityName} onChangeText={setNewAmenityName} placeholder="e.g. Swimming Pool" placeholderTextColor={theme.textMuted} />

                <Text style={[s.label, { color: theme.textSecondary }]}>Pricing Model</Text>
                <View style={s.typeSwitchRow}>
                  {(['PER_USER', 'FLAT_EVENT'] as const).map((t) => (
                    <TouchableOpacity key={t} style={[s.typeSwitchBtn, { backgroundColor: newAmenityType === t ? theme.primaryLight : theme.surfaceSubtle, borderColor: newAmenityType === t ? theme.primary : theme.border }]} onPress={() => setNewAmenityType(t)}>
                      <Text style={[s.typeSwitchText, { color: newAmenityType === t ? theme.primary : theme.textSecondary }]}>{t === 'PER_USER' ? 'Per User' : 'Flat Rate'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[s.label, { color: theme.textSecondary }]}>Base Price (PKR)</Text>
                <TextInput style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} value={newBasePrice} onChangeText={setNewBasePrice} placeholder="0.00" placeholderTextColor={theme.textMuted} keyboardType="numeric" />

                <Text style={[s.label, { color: theme.textSecondary }]}>Max Capacity</Text>
                <TextInput style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} value={newCapacity} onChangeText={setNewCapacity} placeholder="1" placeholderTextColor={theme.textMuted} keyboardType="numeric" />

                <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.primary }]} onPress={createAmenity}>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={s.submitBtnText}>Save Amenity</Text>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    headerActions: { flexDirection: 'row', gap: 10 },
    addBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    historyBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 40 },
    card: { borderRadius: 22, padding: 20, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
    cardMain: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
    amenityIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    name: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
    typeText: { fontSize: 11, fontWeight: '700' },
    priceBox: { alignItems: 'flex-end' },
    priceLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    priceValue: { fontSize: 18, fontWeight: '800' },
    bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
    bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '88%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 16 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 20, fontWeight: '800' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    sheetContent: { paddingBottom: 32 },
    label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 2 },
    input: { borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 18, borderWidth: 1 },
    dateTimeRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
    dateBtn: { flex: 1.5, justifyContent: 'center' },
    dateBtnText: { fontSize: 15 },
    timeInput: { flex: 1 },
    priceBreakdown: { borderRadius: 16, padding: 18, marginBottom: 22, borderWidth: 1, borderStyle: 'dashed' },
    priceBreakdownLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    priceBreakdownValue: { fontSize: 22, fontWeight: '800' },
    bookingHint: { marginTop: 6, fontSize: 12 },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14 },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    typeSwitchRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    typeSwitchBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
    typeSwitchText: { fontWeight: '700', fontSize: 14 },
  });
}

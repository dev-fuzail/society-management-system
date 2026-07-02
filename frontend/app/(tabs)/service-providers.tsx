import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, TextInput, Modal, ScrollView, KeyboardAvoidingView, Pressable, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { getAuthData } from '@/hooks/helperHooks';
import ServiceProviderService, { ServiceProvider } from '@/services/ServiceProviderService';
import { apiGetUserSocieties } from '@/services/SocietyService';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

export default function ServiceProvidersScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [societyId, setSocietyId] = useState('');
  const [search, setSearch] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState('');
  const [providerName, setProviderName] = useState('');
  const [providerCategory, setProviderCategory] = useState('');
  const [providerContact, setProviderContact] = useState('');
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const router = useRouter();

  const handleApiError = (error: any, fallbackMessage: string) => {
    if (error?.isAuthError || error?.statusCode === 401) {
      Alert.alert('Session Expired', 'Please log in again.', [{ text: 'OK', onPress: () => router.replace('/login') }]);
      return;
    }
    Alert.alert('Error', error?.message || fallbackMessage);
  };

  const fetchProviders = async () => {
    try {
      const { userData } = await getAuthData();
      if (!userData?.id) { Alert.alert('Session Expired', 'Please log in again.', [{ text: 'OK', onPress: () => router.replace('/login') }]); return; }
      setUserRole(userData.role);
      const res = await apiGetUserSocieties(userData.id);
      if (res.success && res.result.length > 0) {
        const sId = res.result[0]._id;
        setSocietyId(sId);
        const providerRes = await ServiceProviderService.getProviders(sId);
        if (providerRes.success) setProviders(providerRes.result);
      }
    } catch (error: any) { handleApiError(error, 'Failed to load service providers.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProviders(); }, []);

  const handleCreateProvider = async () => {
    if (!providerName.trim() || !providerCategory.trim() || !providerContact.trim()) { Alert.alert('Validation', 'Name, category and contact are required.'); return; }
    try {
      const res = await ServiceProviderService.addProvider({ name: providerName.trim(), category: providerCategory.trim().toUpperCase(), contact: providerContact.trim(), society_id: societyId });
      if (res.success) {
        setCreateModalVisible(false); setProviderName(''); setProviderCategory(''); setProviderContact('');
        fetchProviders();
      }
    } catch (error: any) { handleApiError(error, 'Failed to add provider.'); }
  };

  const openEditProvider = (provider: ServiceProvider) => {
    setEditingProviderId(provider._id);
    setProviderName(provider.name || '');
    setProviderCategory(provider.category || '');
    setProviderContact(provider.contact || '');
    setEditModalVisible(true);
  };

  const handleUpdateProvider = async () => {
    if (!editingProviderId) return;
    if (!providerName.trim() || !providerCategory.trim() || !providerContact.trim()) { Alert.alert('Validation', 'Name, category and contact are required.'); return; }
    try {
      const res = await ServiceProviderService.updateProvider(editingProviderId, { name: providerName.trim(), category: providerCategory.trim().toUpperCase(), contact: providerContact.trim() });
      if (res.success) {
        setEditModalVisible(false); setEditingProviderId(''); setProviderName(''); setProviderCategory(''); setProviderContact('');
        fetchProviders();
      }
    } catch (error: any) { handleApiError(error, 'Failed to update provider.'); }
  };

  const handleBook = (provider: ServiceProvider) => {
    Alert.alert("Confirm Booking", `Do you want to book ${provider.name} for today?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Book", onPress: async () => {
        try {
          const res = await ServiceProviderService.bookProvider({ provider_id: provider._id, date: new Date().toISOString(), society_id: societyId });
          if (res.success) { Alert.alert("Success", "Booking request sent!"); router.push('/service-bookings'); }
        } catch (error: any) { handleApiError(error, 'Failed to book service.'); }
      }}
    ]);
  };

  const filteredProviders = providers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  const callNumber = (number: string) => {
    const url = `tel:${number}`;
    Linking.canOpenURL(url).then(can => {
      if (can) Linking.openURL(url);
      else Alert.alert('Cannot Call', 'Phone calls are not available on this device.');
    });
  };

  const renderProviderCard = ({ item }: { item: ServiceProvider }) => (
    <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
      <View style={s.cardMain}>
        <View style={[s.iconBox, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="construct-outline" size={22} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.name, { color: theme.text }]}>{item.name}</Text>
          <View style={[s.categoryBadge, { backgroundColor: theme.surfaceSubtle }]}>
            <Text style={[s.categoryText, { color: theme.textSecondary }]}>{item.category}</Text>
          </View>
        </View>
        {userRole === 'admin' && (
          <TouchableOpacity style={[s.editBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primaryMid }]} onPress={() => openEditProvider(item)}>
            <Ionicons name="create-outline" size={16} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={s.ratingRow}>
        <View style={[s.ratingPill, { backgroundColor: theme.warningLight }]}>
          <Ionicons name="star" size={13} color={theme.warning} />
          <Text style={[s.ratingText, { color: theme.warningText }]}>{item.average_rating.toFixed(1)} · {item.total_reviews} reviews</Text>
        </View>
      </View>

      <View style={s.actions}>
        <TouchableOpacity style={[s.callBtn, { borderColor: theme.border }]} onPress={() => callNumber(item.contact)}>
          <Ionicons name="call" size={16} color={theme.primary} />
          <Text style={[s.callBtnText, { color: theme.primary }]}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.bookBtn, { backgroundColor: theme.primary }]} onPress={() => handleBook(item)}>
          <Text style={s.bookBtnText}>Book Service</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ProviderForm = ({ title, onSubmit, onClose }: { title: string; onSubmit: () => void; onClose: () => void }) => (
    <>
      <View style={s.sheetHandle} />
      <View style={s.sheetHeader}>
        <Text style={[s.sheetTitle, { color: theme.text }]}>{title}</Text>
        <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: theme.surfaceSubtle }]}>
          <Ionicons name="close" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[s.label, { color: theme.textSecondary }]}>Full Name</Text>
        <TextInput style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} value={providerName} onChangeText={setProviderName} placeholder="Enter provider name" placeholderTextColor={theme.textMuted} />
        <Text style={[s.label, { color: theme.textSecondary }]}>Category</Text>
        <TextInput style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} value={providerCategory} onChangeText={setProviderCategory} placeholder="e.g. PLUMBING" placeholderTextColor={theme.textMuted} autoCapitalize="characters" />
        <Text style={[s.label, { color: theme.textSecondary }]}>Contact Number</Text>
        <TextInput style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]} value={providerContact} onChangeText={setProviderContact} placeholder="Enter phone number" placeholderTextColor={theme.textMuted} keyboardType="phone-pad" />
        <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.primary }]} onPress={onSubmit}>
          <Text style={s.submitBtnText}>{title}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={[s.header, { backgroundColor: theme.surface, borderBottomColor: theme.borderLight }]}>
        <Text style={[s.headerTitle, { color: theme.text }]}>Service Providers</Text>
        <View style={s.headerActions}>
          {userRole === 'admin' && (
            <TouchableOpacity style={[s.addBtn, { backgroundColor: theme.primary }]} onPress={() => setCreateModalVisible(true)}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.historyBtn, { backgroundColor: theme.primaryLight }]} onPress={() => router.push('/service-bookings')}>
            <Ionicons name="time-outline" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[s.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.textMuted} />
        <TextInput style={[s.searchField, { color: theme.text }]} placeholder="Search plumbing, electrical..." placeholderTextColor={theme.textMuted} value={search} onChangeText={setSearch} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredProviders}
          renderItem={renderProviderCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="people-outline" size={36} color={theme.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: theme.text }]}>No providers found</Text>
              <Text style={[s.emptyMsg, { color: theme.textMuted }]}>Service providers will appear here once added.</Text>
            </View>
          }
          onRefresh={fetchProviders}
          refreshing={loading}
        />
      )}

      <Modal visible={createModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={s.overlay} onPress={() => setCreateModalVisible(false)}>
            <View style={[s.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <ProviderForm title="Add Provider" onSubmit={handleCreateProvider} onClose={() => setCreateModalVisible(false)} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={s.overlay} onPress={() => setEditModalVisible(false)}>
            <View style={[s.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <ProviderForm title="Edit Provider" onSubmit={handleUpdateProvider} onClose={() => setEditModalVisible(false)} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={contactModalVisible} transparent animationType="fade" onRequestClose={() => setContactModalVisible(false)}>
        <Pressable style={s.overlayCenter} onPress={() => setContactModalVisible(false)}>
          <View style={[s.contactCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: theme.text }]}>Contact Info</Text>
              <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[s.contactSubtitle, { color: theme.textSecondary }]}>You can reach {selectedProvider?.name} at:</Text>
            <Text selectable style={[s.contactNumber, { color: theme.text }]}>{selectedProvider?.contact}</Text>
            <View style={s.actions}>
              <TouchableOpacity style={[s.callBtn, { flex: 1.3, borderColor: theme.success, backgroundColor: theme.successLight }]} onPress={() => { setContactModalVisible(false); callNumber(selectedProvider!.contact); }}>
                <Ionicons name="call" size={16} color={theme.successText} />
                <Text style={[s.callBtnText, { color: theme.successText }]}>Call Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.bookBtn, { backgroundColor: theme.surfaceSubtle, flex: 1 }]} onPress={() => setContactModalVisible(false)}>
                <Text style={[s.bookBtnText, { color: theme.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
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
    searchBox: { flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    searchField: { flex: 1, paddingVertical: 12, marginLeft: 10, fontSize: 15 },
    listContent: { paddingHorizontal: 16, paddingBottom: 40 },
    card: { borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    cardMain: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
    iconBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    name: { fontSize: 16, fontWeight: '700', marginBottom: 5 },
    categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
    categoryText: { fontSize: 11, fontWeight: '700' },
    editBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    ratingRow: { marginBottom: 14 },
    ratingPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    ratingText: { fontSize: 12, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 10 },
    callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
    callBtnText: { fontWeight: '700', fontSize: 14 },
    bookBtn: { flex: 1.5, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
    bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 20 },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '85%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 16 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 20, fontWeight: '800' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    contactCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
    contactSubtitle: { fontSize: 14, marginBottom: 10 },
    contactNumber: { fontSize: 22, fontWeight: '800', letterSpacing: 0.5, marginBottom: 18 },
    label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 2 },
    input: { borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 18, borderWidth: 1 },
    submitBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8, marginBottom: 20 },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}

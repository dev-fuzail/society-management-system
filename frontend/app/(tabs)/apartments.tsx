import { PrimaryButton } from "@/components/PrimaryButton";
import { getAuthData } from "@/hooks/helperHooks";
import { apiDeleteApartment, apiGetMyApartments, apiGetSocietyApartmentsForAdmin, apiVerifyApartment } from "@/services/ApartmentService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { AppTheme } from "@/constants/theme";

const getStatusColor = (status: string) => {
  switch (status) {
    case 'verified': return '#059669';
    case 'pending': return '#d97706';
    case 'rejected': return '#dc2626';
    default: return '#64748b';
  }
};

const getStatusBg = (status: string) => {
  switch (status) {
    case 'verified': return '#d1fae5';
    case 'pending': return '#fef3c7';
    case 'rejected': return '#fee2e2';
    default: return '#f1f5f9';
  }
};

export default function ApartmentsScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const router = useRouter();
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const fetchApartments = async () => {
    try {
      setLoading(true);
      const { userData } = await getAuthData();
      setUser(userData);
      const res = userData?.role === "admin" ? await apiGetSocietyApartmentsForAdmin() : await apiGetMyApartments();
      if (res.success) setApartments(res.result);
      else Alert.alert("Error", res.message || "Failed to fetch apartments.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(React.useCallback(() => { fetchApartments(); }, []));

  const handleDelete = (id: string) => {
    Alert.alert("Delete Apartment", "Are you sure you want to delete this apartment?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          const res = await apiDeleteApartment(id);
          if (res.success) { Alert.alert("Success", "Apartment deleted successfully."); setApartments(apartments.filter(apt => apt._id !== id)); }
          else Alert.alert("Error", res.message || "Failed to delete apartment.");
        } catch (error: any) { Alert.alert("Error", error.message); }
      }},
    ]);
  };

  const handleVerify = async (id: string, status: 'verified' | 'rejected') => {
    try {
      const res = await apiVerifyApartment(id, status);
      if (res.success) { Alert.alert("Success", `Apartment has been ${status}.`); setApartments(apartments.map(apt => apt._id === id ? { ...apt, status } : apt)); }
      else Alert.alert("Error", res.message || "Failed to update status.");
    } catch (error: any) { Alert.alert("Error", error.message); }
  };

  const navigateToEdit = (item: any) => {
    router.push({ pathname: "/apartment-form", params: { id: item._id, apartment_name: item.apartment_name, floor: item.floor ? String(item.floor) : '' } });
  };

  if (loading) {
    return <View style={[s.container, s.center, { backgroundColor: theme.bg }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <FlatList
        data={apartments}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={s.cardRow}>
              <View style={[s.aptIconBox, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="business-outline" size={22} color={theme.primary} />
              </View>
              <View style={s.infoContainer}>
                <Text style={[s.cardTitle, { color: theme.text }]}>{item.apartment_name}</Text>
                {user?.role === 'admin' && item.owned_by && (
                  <View style={s.ownerRow}>
                    <Ionicons name="person-outline" size={12} color={theme.textMuted} />
                    <Text style={[s.ownerText, { color: theme.textSecondary }]}>{item.owned_by.name}</Text>
                  </View>
                )}
                <View style={[s.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
                  <View style={[s.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                  <Text style={[s.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
                <Text style={[s.floorText, { color: theme.textMuted }]}>Floor: {item.floor || 'N/A'}</Text>
              </View>
              <View style={s.actions}>
                {user?.role === 'admin' && item.status === 'pending' && (
                  <View style={[s.adminActions, { borderRightColor: theme.borderLight }]}>
                    <TouchableOpacity onPress={() => handleVerify(item._id, 'verified')} style={[s.actionBtn, { backgroundColor: '#f0fdf4', borderColor: theme.borderLight }]}>
                      <Ionicons name="checkmark" size={18} color="#059669" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleVerify(item._id, 'rejected')} style={[s.actionBtn, { backgroundColor: '#fef2f2', borderColor: theme.borderLight }]}>
                      <Ionicons name="close" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity onPress={() => navigateToEdit(item)} style={[s.actionBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderLight }]}>
                  <Ionicons name="pencil-outline" size={18} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={[s.actionBtn, { backgroundColor: theme.dangerLight, borderColor: theme.borderLight }]}>
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={[s.title, { color: theme.text }]}>My Apartments</Text>
            <PrimaryButton title="Add New Apartment" onPress={() => router.push('/apartment-form')} />
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={[s.emptyIcon, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="business-outline" size={36} color={theme.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: theme.text }]}>No apartments found</Text>
            <Text style={[s.emptyMsg, { color: theme.textMuted }]}>Add your first apartment using the button above.</Text>
          </View>
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20, paddingBottom: 40 },
    header: { marginBottom: 24 },
    title: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
    card: { borderRadius: 18, marginBottom: 14, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, overflow: 'hidden' },
    cardRow: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
    aptIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    infoContainer: { flex: 1 },
    cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
    ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    ownerText: { fontSize: 13, fontWeight: '500' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start', gap: 5, marginBottom: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    floorText: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    adminActions: { flexDirection: 'row', gap: 6, marginRight: 8, paddingRight: 8, borderRightWidth: 1 },
    actionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  });
}

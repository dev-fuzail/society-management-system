import { PrimaryButton } from "@/components/PrimaryButton";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getAuthData } from "@/hooks/helperHooks";
import { apiDeleteApartment, apiGetMyApartments, apiGetSocietyApartmentsForAdmin, apiVerifyApartment } from "@/services/ApartmentService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";

export default function ApartmentsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const fetchApartments = async () => {
    try {
      setLoading(true);
      const { userData } = await getAuthData();
      setUser(userData);

      // Fetch data based on user role
      const res =
        userData?.role === "admin"
          ? await apiGetSocietyApartmentsForAdmin()
          : await apiGetMyApartments();

      if (res.success) {
        setApartments(res.result);
      } else {
        Alert.alert("Error", res.message || "Failed to fetch apartments.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchApartments();
    }, [])
  );

  const handleDelete = (id: string) => {
    Alert.alert("Delete Apartment", "Are you sure you want to delete this apartment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await apiDeleteApartment(id);
            if (res.success) {
              Alert.alert("Success", "Apartment deleted successfully.");
              setApartments(apartments.filter(apt => apt._id !== id));
            } else {
              Alert.alert("Error", res.message || "Failed to delete apartment.");
            }
          } catch (error: any) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };

  const handleVerify = async (id: string, status: 'verified' | 'rejected') => {
    try {
      const res = await apiVerifyApartment(id, status);
      if (res.success) {
        Alert.alert("Success", `Apartment has been ${status}.`);
        // Update the status locally
        setApartments(apartments.map(apt =>
          apt._id === id ? { ...apt, status } : apt
        ));
      } else {
        Alert.alert("Error", res.message || "Failed to update status.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  const navigateToEdit = (item: any) => {
    router.push({
      pathname: "/apartment-form",
      params: {
        id: item._id,
        apartment_name: item.apartment_name,
        floor: item.floor ? String(item.floor) : '',
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: '#f8fafc' }]}>
      <FlatList
        data={apartments}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardMain}>
              <View style={styles.infoContainer}>
                <Text style={styles.cardTitle}>{item.apartment_name}</Text>
                {user?.role === 'admin' && item.owned_by && (
                  <View style={styles.ownerRow}>
                    <Ionicons name="person-outline" size={12} color="#64748b" />
                    <Text style={styles.ownerText}>{item.owned_by.name}</Text>
                  </View>
                )}
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
                <Text style={styles.cardSubtitle}>Floor: {item.floor || 'N/A'}</Text>
              </View>
              
              <View style={styles.actions}>
                {user?.role === 'admin' && item.status === 'pending' && (
                  <View style={styles.adminActions}>
                    <TouchableOpacity onPress={() => handleVerify(item._id, 'verified')} style={[styles.actionButton, styles.verifyBtn]}>
                      <Ionicons name="checkmark" size={20} color="#059669" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleVerify(item._id, 'rejected')} style={[styles.actionButton, styles.rejectBtn]}>
                      <Ionicons name="close" size={20} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity onPress={() => navigateToEdit(item)} style={styles.actionButton}>
                  <Ionicons name="pencil-outline" size={20} color="#4f46e5" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionButton}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>My Apartments</Text>
            <PrimaryButton title="Add New Apartment" onPress={() => router.push('/apartment-form')} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyText}>No apartments found.</Text>
          </View>
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'verified': return '#059669'; // green
    case 'pending': return '#d97706'; // orange/yellow
    case 'rejected': return '#dc2626'; // red
    default: return '#64748b'; // slate
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: '#1e293b',
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  cardMain: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: '#1e293b',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ownerText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 6,
    color: '#94a3b8',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: "row",
    alignItems: 'center',
    gap: 12,
  },
  adminActions: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 8,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  verifyBtn: {
    backgroundColor: '#f0fdf4',
  },
  rejectBtn: {
    backgroundColor: '#fef2f2',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
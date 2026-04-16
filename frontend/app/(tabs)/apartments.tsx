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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={apartments}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: styles.card.backgroundColor }]}>
            <View>
              <Text style={[styles.cardTitle]}>{item.apartment_name}</Text>
              {user?.role === 'admin' && item.owned_by && (
                <Text style={styles.ownerText}>Owner: {item.owned_by.name}</Text>
              )}
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
              <Text style={styles.cardSubtitle}>Floor: {item.floor || 'N/A'}</Text>
            </View>
            <View style={styles.actions}>
              {/* Admin verification buttons */}
              {user?.role === 'admin' && item.status === 'pending' && (
                <>
                  <TouchableOpacity onPress={() => handleVerify(item._id, 'verified')} style={styles.actionButton}>
                    <Ionicons name="checkmark-circle-outline" size={26} color="green" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleVerify(item._id, 'rejected')} style={styles.actionButton}>
                    <Ionicons name="close-circle-outline" size={26} color="red" />
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={() => navigateToEdit(item)} style={styles.actionButton}>
                <Ionicons name="pencil-outline" size={24} color={theme.tint} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item._id)}>
                <Ionicons name="trash-outline" size={24} color={styles.trashIcon.color} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>My Apartments</Text>
            <PrimaryButton title="Add New Apartment" onPress={() => router.push('/apartment-form')} />
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>You haven't added any apartments yet.</Text>
        }
        contentContainerStyle={{ padding: 20 }}
      />
    </View>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'verified': return '#28a745'; // green
    case 'pending': return '#ffc107'; // yellow
    case 'rejected': return '#dc3545'; // red
    default: return '#6c757d'; // gray
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    backgroundColor: "#fff",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: '#000',
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: 4,
    color: '#888',
  },
  actions: {
    flexDirection: "row",
    gap: 20,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
  trashIcon: {
    color: "#ff3b30"
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ownerText: {
    fontSize: 12,
    color: '#000',
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionButton: {
    padding: 4, // Add padding to make icons easier to press
  }
});
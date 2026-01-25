import { PrimaryButton } from "@/components/PrimaryButton";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getAuthData } from "@/hooks/helperHooks";
import { apiCreateApartment, apiGetApartmentById, apiUpdateApartment } from "@/services/ApartmentService";
import { apiGetSocietyUsers, apiGetUserSocieties } from "@/services/SocietyService"; // ✅ Use the working service
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ApartmentFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  // Form State
  const [apartmentName, setApartmentName] = useState("");
  const [floor, setFloor] = useState("");
  const [block, setBlock] = useState("");

  // Admin: Owner Management
  const [ownedBy, setOwnedBy] = useState<string>("");
  const [ownerName, setOwnerName] = useState<string>("Select Owner");
  const [isAdmin, setIsAdmin] = useState(false);
  
  // User Selection State
  const [users, setUsers] = useState<any[]>([]);
  const [societyId, setSocietyId] = useState<string>("");
  const [showUserModal, setShowUserModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(!!id);

  useEffect(() => {
    const init = async () => {
      const { userData } = await getAuthData();
      const adminStatus = userData?.role === 'admin';
      setIsAdmin(adminStatus);

      const res = await apiGetUserSocieties(userData.id);
      const selectedSociety = res.result;
      setSocietyId(selectedSociety[0]._id);

      // 1. If Admin, fetch society users immediately
      if (adminStatus && societyId) {
        fetchSocietyMembers(societyId);
      }

      // 2. If Edit Mode: Fetch apartment details
      if (id) {
        try {
          const res = await apiGetApartmentById(id as string);
          console.log('id for api', id)
          if (res.success && res.result) {
            const apt = res.result;
            setApartmentName(apt.apartment_name);
            setFloor(apt.floor?.toString() || "");
            setBlock(apt.block || "");

            // ✅ Robust OwnedBy Handling
            if (apt.owned_by) {
              if (typeof apt.owned_by === 'object') {
                setOwnedBy(apt.owned_by._id);
                setOwnerName(apt.owned_by.name || "Unknown");
              } else {
                setOwnedBy(apt.owned_by);
                setOwnerName("Unknown (ID only)");
              }
            }
          }
        } catch (error) {
          Alert.alert("Error", "Failed to load apartment details");
        }
      }
      setDataLoading(false);
    };
    init();
  }, [id]);

  // ✅ Reused Logic: Fetch Users
  const fetchSocietyMembers = async (societyId: string) => {
    try {
      const response = await apiGetSocietyUsers(societyId);
      if (response.success && response.result) {
        // Combine admins and members
        const allUsers = [...response.result.admins, ...response.result.members];
        
        // Deduplicate logic
        const uniqueUsers = Array.from(new Map(allUsers.map(item => [item._id || item.id, item])).values());
        
        setUsers(uniqueUsers);
      }
    } catch (error) {
      console.log("Error fetching members", error);
    }
  };

  const handleSubmit = async () => {
    if (!apartmentName) {
      Alert.alert("Validation Error", "Apartment name is required.");
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        apartment_name: apartmentName,
        floor: Number(floor) || undefined,
        block: block || undefined
      };

      // Only send owned_by if admin and it's set
      if (isAdmin && ownedBy) {
        payload.owned_by = ownedBy;
      }

      const response = id
        ? await apiUpdateApartment(id as string, payload)
        : await apiCreateApartment(payload);

      if (response.success) {
        Alert.alert("Success", `Apartment ${id ? 'updated' : 'created'} successfully!`);
        router.back();
      } else {
        Alert.alert("Error", response.message || "An error occurred.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={theme.tint} /></View>;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        {id ? "Edit Apartment" : "Add New Apartment"}
      </Text>

      <Text style={[styles.label, { color: theme.text }]}>Apartment Name / Number *</Text>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.icon }]}
        value={apartmentName}
        onChangeText={setApartmentName}
        placeholder="e.g., A-101"
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.text }]}>Floor</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.icon }]}
            value={floor}
            onChangeText={setFloor}
            keyboardType="number-pad"
            placeholder="0"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.text }]}>Block</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.icon }]}
            value={block}
            onChangeText={setBlock}
            placeholder="Block"
          />
        </View>
      </View>

      {/* ✅ Admin Only: Owner Selection Trigger */}
      {isAdmin && (
        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.label, { color: theme.text }]}>Assigned Owner</Text>
          <TouchableOpacity
            style={[styles.input, { borderColor: theme.icon, justifyContent: 'center' }]}
            onPress={() => setShowUserModal(true)}
          >
            <Text style={{ color: ownedBy ? theme.text : '#999' }}>{ownerName}</Text>
            <Ionicons name="chevron-down" size={20} color={theme.text} style={{ position: 'absolute', right: 10 }} />
          </TouchableOpacity>
        </View>
      )}

      <PrimaryButton
        title={loading ? "Saving..." : (id ? "Update Apartment" : "Create Apartment")}
        onPress={handleSubmit}
        disabled={loading}
      />

      {/* ✅ User Selection Modal (Styled like Ticket Detail) */}
      <Modal visible={showUserModal} animationType="slide" transparent={true}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowUserModal(false)}>
            <View style={[styles.modalContainer, { backgroundColor: '#fff' }]} onTouchStart={e => e.stopPropagation()}>
                
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Owner</Text>
                
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                    {/* Unassign Option */}
                    <TouchableOpacity 
                        style={[styles.userOption, !ownedBy && styles.selectedUserOption]}
                        onPress={() => {
                            setOwnedBy("");
                            setOwnerName("Unassigned");
                            setShowUserModal(false);
                        }}
                    >
                         <Ionicons name="person-outline" size={20} color={!ownedBy ? theme.tint : '#757575'} />
                         <Text style={[styles.userOptionText, !ownedBy && {color: theme.tint, fontWeight:'bold'}, {color: theme.text}]}>
                            Unassigned
                        </Text>
                    </TouchableOpacity>

                    {/* User List */}
                    {users.map((u) => {
                        const isSelected = ownedBy === u._id;
                        return (
                            <TouchableOpacity
                                key={u._id}
                                style={[styles.userOption, isSelected && styles.selectedUserOption]}
                                onPress={() => {
                                    setOwnedBy(u._id);
                                    setOwnerName(u.name);
                                    setShowUserModal(false);
                                }}
                            >
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{u.name.charAt(0).toUpperCase()}</Text>
                                </View>
                                <View>
                                    <Text style={[styles.userOptionText, isSelected && { color: theme.tint, fontWeight: 'bold' }, {color: theme.text}]}>
                                        {u.name}
                                    </Text>
                                    <Text style={styles.userRoleText}>{u.role}</Text>
                                </View>
                                {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.tint} style={{ marginLeft: 'auto' }} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
                <PrimaryButton title="Close" onPress={() => setShowUserModal(false)} />
            </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 30 },
  label: { fontSize: 16, marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 20 },
  
  // Modal Styles (Matches TicketDetailScreen)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', maxHeight: '80%', padding: 20, borderRadius: 15, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  
  // User List Styles
  userOption: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  selectedUserOption: { backgroundColor: '#E3F2FD' }, // Light blue highlight
  userOptionText: { fontSize: 16, marginLeft: 10 },
  userRoleText: { fontSize: 12, color: '#757575', marginLeft: 10 },
  avatarPlaceholder: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: 'bold', color: '#555' },
});
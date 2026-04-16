import { getAuthData } from "@/hooks/helperHooks";
import { apiCreateApartment, apiGetApartmentById, apiUpdateApartment } from "@/services/ApartmentService";
import { apiGetSocietyUsers, apiGetUserSocieties } from "@/services/SocietyService";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
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
  const [showUserModal, setShowUserModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(!!id);

  const fetchSocietyMembers = useCallback(async (sId: string) => {
    try {
      const response = await apiGetSocietyUsers(sId);
      if (response.success && response.result) {
        const allUsers = [...response.result.admins, ...response.result.members];
        const uniqueUsers = Array.from(new Map(allUsers.map(item => [item._id || item.id, item])).values());
        setUsers(uniqueUsers);
      }
    } catch (error) {
      console.log("Error fetching members", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { userData } = await getAuthData();
      const adminStatus = userData?.role === 'admin';
      setIsAdmin(adminStatus);

      const res = await apiGetUserSocieties(userData.id);
      const selectedSociety = res.result;
      if (selectedSociety.length > 0) {
        const sId = selectedSociety[0]._id;

        if (adminStatus) {
            fetchSocietyMembers(sId);
        }
      }

      if (id) {
        try {
          const resApt = await apiGetApartmentById(id as string);
          if (resApt.success && resApt.result) {
            const apt = resApt.result;
            setApartmentName(apt.apartment_name);
            setFloor(apt.floor?.toString() || "");
            setBlock(apt.block || "");

            if (apt.owned_by) {
              if (typeof apt.owned_by === 'object') {
                setOwnedBy(apt.owned_by._id);
                setOwnerName(apt.owned_by.name || "Unknown");
              } else {
                setOwnedBy(apt.owned_by);
              }
            }
          }
        } catch {
          Alert.alert("Error", "Failed to load apartment details");
        }
      }
      setDataLoading(false);
    };
    init();
  }, [id, fetchSocietyMembers]);

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
    } catch {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return <View style={[styles.container, styles.center, { backgroundColor: '#f8fafc' }]}><ActivityIndicator size="large" color="#4f46e5" /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: '#f8fafc' }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
            <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
            {id ? "Edit Apartment" : "Add Apartment"}
        </Text>

        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Unit Information</Text>
            
            <Text style={styles.label}>Apartment Name / Number *</Text>
            <TextInput
                style={styles.input}
                value={apartmentName}
                onChangeText={setApartmentName}
                placeholder="e.g. A-101"
                placeholderTextColor="#94a3b8"
            />

            <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                <Text style={styles.label}>Floor</Text>
                <TextInput
                    style={styles.input}
                    value={floor}
                    onChangeText={setFloor}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                />
                </View>
                <View style={{ flex: 1 }}>
                <Text style={styles.label}>Block</Text>
                <TextInput
                    style={styles.input}
                    value={block}
                    onChangeText={setBlock}
                    placeholder="Block"
                    placeholderTextColor="#94a3b8"
                />
                </View>
            </View>
        </View>

        {isAdmin && (
            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Ownership</Text>
                <Text style={styles.label}>Assigned Owner</Text>
                <TouchableOpacity
                    style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                    onPress={() => setShowUserModal(true)}
                >
                    <Text style={{ color: ownedBy ? '#1e293b' : '#94a3b8', fontSize: 16 }}>{ownerName}</Text>
                    <Ionicons name="chevron-down" size={20} color="#64748b" />
                </TouchableOpacity>
            </View>
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{id ? "Update Unit" : "Create Unit"}</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showUserModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setShowUserModal(false)} />
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Owner</Text>
                    <TouchableOpacity onPress={() => setShowUserModal(false)}>
                        <Ionicons name="close" size={24} color="#1e293b" />
                    </TouchableOpacity>
                </View>
                
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity 
                        style={[styles.userOption, !ownedBy && styles.selectedUserOption]}
                        onPress={() => {
                            setOwnedBy("");
                            setOwnerName("Unassigned");
                            setShowUserModal(false);
                        }}
                    >
                         <View style={[styles.avatarPlaceholder, { backgroundColor: '#f1f5f9' }]}>
                            <Ionicons name="person-remove-outline" size={16} color="#64748b" />
                         </View>
                         <Text style={[styles.userOptionText, !ownedBy && {color: '#4f46e5', fontWeight:'700'}]}>
                            Unassigned
                        </Text>
                    </TouchableOpacity>

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
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.userOptionText, isSelected && { color: '#4f46e5', fontWeight: '700' }]}>
                                        {u.name}
                                    </Text>
                                    <Text style={styles.userRoleText}>{u.role}</Text>
                                </View>
                                {isSelected && <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 6 },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: "800", color: '#1e293b', marginBottom: 24 },
  
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  
  submitBtn: {
    backgroundColor: '#4f46e5',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 10,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  modalContainer: { 
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, 
    padding: 24, maxHeight: '80%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  
  userOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', gap: 12, marginBottom: 8 },
  selectedUserOption: { backgroundColor: '#eef2ff', borderColor: '#4f46e5' },
  userOptionText: { fontSize: 15, color: '#1e293b', fontWeight: '600' },
  userRoleText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  avatarPlaceholder: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
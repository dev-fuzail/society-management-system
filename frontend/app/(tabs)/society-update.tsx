import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Alert, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { apiUpdateSociety, apiGetUserSocieties } from "@/services/SocietyService";
import { getAuthData } from "@/hooks/helperHooks";
import { Ionicons } from "@expo/vector-icons";

export default function SocietyUpdateScreen() {
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    contact_email: "",
    total_apartments: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      const { userData } = await getAuthData();
      if (!userData) {
        router.replace("/(tabs)");
        return;
      }

      if (userData.role !== 'admin') {
        Alert.alert("Access Denied", "You must be an admin to access this page.");
        router.back();
        return;
      }

      try {
        const res = await apiGetUserSocieties(userData.id);
        if (res.success && res.result.length > 0) {
          const currentSociety = res.result[0];
          setForm({
            name: currentSociety.name || "",
            address: currentSociety.address || "",
            city: currentSociety.city || "",
            contact_email: currentSociety.contact_email || "",
            total_apartments: String(currentSociety.total_apartments || ""),
          });
        } else {
          Alert.alert("Error", "Could not find society information.");
        }
      } catch {
        Alert.alert("Error", "Failed to load society data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.address || !form.city) {
      return Alert.alert("Missing Fields", "Please fill in all required fields.");
    }

    try {
      setIsSubmitting(true);
      const { userData } = await getAuthData();

      if (!userData || !userData.id) {
        return Alert.alert("Error", "User not found. Please log in again.");
      }
      
      const payload = {
        userId: userData.id,
        name: form.name,
        address: form.address,
        city: form.city,
        contact_email: form.contact_email,
        total_apartments: Number(form.total_apartments),
      };

      const res = await apiUpdateSociety(payload);

      if (res.success && res.result) {
        const updatedSociety = res.result;
        setForm({
          name: updatedSociety.name,
          address: updatedSociety.address,
          city: updatedSociety.city,
          contact_email: updatedSociety.contact_email,
          total_apartments: String(updatedSociety.total_apartments),
        });
        Alert.alert("Success", "Society updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to update society.");
      }
    } catch {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }]}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '500' }}>Loading Society Data...</Text>
        </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#f8fafc' }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
            <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Society Settings</Text>

        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <Text style={styles.label}>Society Name</Text>
            <TextInput
            style={styles.input}
            placeholder="e.g. Green Valley Residency"
            placeholderTextColor="#94a3b8"
            value={form.name}
            onChangeText={(t) => handleChange("name", t)}
            />

            <Text style={styles.label}>Full Address</Text>
            <TextInput
            style={styles.input}
            placeholder="Building, Road, Landmark"
            placeholderTextColor="#94a3b8"
            value={form.address}
            onChangeText={(t) => handleChange("address", t)}
            />

            <Text style={styles.label}>City</Text>
            <TextInput
            style={styles.input}
            placeholder="City"
            placeholderTextColor="#94a3b8"
            value={form.city}
            onChangeText={(t) => handleChange("city", t)}
            />
        </View>

        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Contact & Scale</Text>

            <Text style={styles.label}>Official Email</Text>
            <TextInput
            style={styles.input}
            placeholder="contact@society.com"
            keyboardType="email-address"
            placeholderTextColor="#94a3b8"
            value={form.contact_email}
            onChangeText={(t) => handleChange("contact_email", t)}
            />

            <Text style={styles.label}>Total Apartment Units</Text>
            <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor="#94a3b8"
            value={form.total_apartments}
            onChangeText={(t) => handleChange("total_apartments", t)}
            />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Society Details</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 6 },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: '#1e293b',
    marginBottom: 24,
  },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
  },
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
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
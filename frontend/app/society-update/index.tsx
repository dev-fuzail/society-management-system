import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { Stack, router } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { PrimaryButton } from "@/components/PrimaryButton";
import { apiUpdateSociety, apiGetUserSocieties } from "@/services/SocietyService";
import { getAuthData } from "@/hooks/helperHooks";
import { UserData } from "@/services/types";

export default function SocietyUpdateScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    contact_email: "",
    total_apartments: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      const { userData } = await getAuthData();
      if (!userData) {
        router.replace("/(tabs)");
        return;
      }
      setUser(userData);

      // Role-based access check
      if (userData.role !== 'admin') {
        Alert.alert("Access Denied", "You must be an admin to access this page.");
        router.back();
        return;
      }

      try {
        const res = await apiGetUserSocieties(userData._id);
        if (res.success && res.result.length > 0) {
          const currentSociety = res.result[0];
          console.log('currentSociety: ', currentSociety);
          setForm({
            name: currentSociety.name || "",
            address: currentSociety.address || "",
            city: currentSociety.city || "",
            contact_email: currentSociety.contact_email || "",
            total_apartments: String(currentSociety.total_apartments || ""),
          });
        } else {
          Alert.alert("Error", res.message || "Could not find society information.");
        }
      } catch (error) {
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
        // Update state to reflect changes instantly
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
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={theme.tint} />
            <Text style={{ marginTop: 10, color: theme.text }}>Loading Society Data...</Text>
        </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Update Society Details</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.icon, color: theme.text, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
          placeholder="Society Name *"
          placeholderTextColor="#999"
          value={form.name}
          onChangeText={(t) => handleChange("name", t)}
        />
        <TextInput
          style={[styles.input, { borderColor: theme.icon, color: theme.text, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
          placeholder="Address *"
          placeholderTextColor="#999"
          value={form.address}
          onChangeText={(t) => handleChange("address", t)}
        />
        <TextInput
          style={[styles.input, { borderColor: theme.icon, color: theme.text, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
          placeholder="City *"
          placeholderTextColor="#999"
          value={form.city}
          onChangeText={(t) => handleChange("city", t)}
        />
        <TextInput
          style={[styles.input, { borderColor: theme.icon, color: theme.text, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
          placeholder="Contact Email"
          keyboardType="email-address"
          placeholderTextColor="#999"
          value={form.contact_email}
          onChangeText={(t) => handleChange("contact_email", t)}
        />
        <TextInput
          style={[styles.input, { borderColor: theme.icon, color: theme.text, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
          placeholder="Total Apartments"
          keyboardType="numeric"
          placeholderTextColor="#999"
          value={form.total_apartments}
          onChangeText={(t) => handleChange("total_apartments", t)}
        />

        <PrimaryButton
          title={isSubmitting ? "Updating..." : "Update Society"}
          onPress={handleSubmit}
          disabled={isSubmitting}
        />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
});

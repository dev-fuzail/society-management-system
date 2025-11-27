import React, { useState } from "react";
import { View, Text, TextInput, Alert, StyleSheet, ScrollView, Platform } from "react-native";
import { Stack, router } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { PrimaryButton } from "@/components/PrimaryButton";
import { apiUpdateSociety } from "@/services/SocietyService";
import { getAuthData } from "@/hooks/helperHooks";

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
  const [loading, setLoading] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.address || !form.city) {
      return Alert.alert("Missing Fields", "Please fill in all required fields.");
    }

    try {
      setLoading(true);
      const { userData } = await getAuthData();
      console.log('userData: ', userData);

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
      console.log('payload: ', payload);


      const res = await apiUpdateSociety({data: payload});
      console.log('res: ', res.result);

      if (res.status) {
        Alert.alert("Success", "Society updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to update society.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <View style={styles.container}>
      <Text style={styles.title}>Society Update Page</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.icon, color: theme.text }]}
          placeholder="Society Name *"
          placeholderTextColor="#999"
          value={form.name}
          onChangeText={(t) => handleChange("name", t)}
        />
        <TextInput
          style={[styles.input, { borderColor: theme.icon, color: theme.text }]}
          placeholder="Address *"
          placeholderTextColor="#999"
          value={form.address}
          onChangeText={(t) => handleChange("address", t)}
        />
        <TextInput
          style={[styles.input, { borderColor: theme.icon, color: theme.text }]}
          placeholder="City *"
          placeholderTextColor="#999"
          value={form.city}
          onChangeText={(t) => handleChange("city", t)}
        />
        <TextInput
          style={[styles.input, { borderColor: theme.icon, color: theme.text }]}
          placeholder="Contact Email"
          keyboardType="email-address"
          placeholderTextColor="#999"
          value={form.contact_email}
          onChangeText={(t) => handleChange("contact_email", t)}
        />
        <TextInput
          style={[styles.input, { borderColor: theme.icon, color: theme.text }]}
          placeholder="Total Apartments"
          keyboardType="numeric"
          placeholderTextColor="#999"
          value={form.total_apartments}
          onChangeText={(t) => handleChange("total_apartments", t)}
        />

        <PrimaryButton
          title={loading ? "Updating..." : "Update Society"}
          onPress={handleSubmit}
          disabled={loading}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
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

import { PrimaryButton } from "@/components/PrimaryButton";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiCreateApartment, apiUpdateApartment } from "@/services/ApartmentService";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";

export default function ApartmentFormScreen() {
  const router = useRouter();
  const { id, name, floor: floorParam } = useLocalSearchParams(); // Get apartment data if editing
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [apartmentName, setApartmentName] = useState("");
  const [floor, setFloor] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditMode = !!id;

  useEffect(() => {
    if (isEditMode) {
      // Pre-fill form with data passed via route params
      setApartmentName(name as string || "");
      setFloor(floorParam as string || "");
    }
  }, [id]);

  const handleSubmit = async () => {
    if (!apartmentName) {
      Alert.alert("Validation Error", "Apartment name is required.");
      return;
    }
    setLoading(true);
    try {
      const payload = { apartment_name: apartmentName, floor: Number(floor) || undefined };
      const response = isEditMode
        ? await apiUpdateApartment(id as string, payload)
        : await apiCreateApartment(payload);

      if (response.success) {
        Alert.alert("Success", `Apartment ${isEditMode ? 'updated' : 'created'} successfully!`);
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        {isEditMode ? "Edit Apartment" : "Add New Apartment"}
      </Text>

      <Text style={[styles.label, { color: theme.text }]}>Apartment Name / Number *</Text>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.icon }]}
        value={apartmentName}
        onChangeText={setApartmentName}
        placeholder="e.g., A-101, B-Wing Flat 203"
        placeholderTextColor="#999"
      />

      <Text style={[styles.label, { color: theme.text }]}>Floor (Optional)</Text>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.icon }]}
        value={floor}
        onChangeText={setFloor}
        placeholder="e.g., 1, 10"
        placeholderTextColor="#999"
        keyboardType="number-pad"
      />

      <PrimaryButton
        title={loading ? "Saving..." : (isEditMode ? "Update Apartment" : "Create Apartment")}
        onPress={handleSubmit}
        disabled={loading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
});
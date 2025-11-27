// app/reset-password.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { apiResetPassword } from "@/services/AuthService";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function ResetPasswordScreen() {
  const { token, email } = useLocalSearchParams<{ token: string; email: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!password || !confirm) {
      return Alert.alert("Missing Fields", "Please fill in both fields.");
    }
    if (password !== confirm) {
      return Alert.alert("Error", "Passwords do not match.");
    }

    try {
      setLoading(true);
      const res = await apiResetPassword(email!, token!, password);
      if (res.status) {
        Alert.alert("Success", "Password reset successfully.", [
          { text: "Login", onPress: () => router.replace("/login") },
        ]);
      } else {
        Alert.alert("Error", res.message || "Unable to reset password.");
      }
    } catch (err: any) {
      console.log("Reset error:", err);
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Your Password</Text>
      <Text style={styles.subtitle}>
        For <Text style={styles.email}>{email}</Text>
      </Text>

      <TextInput
        style={styles.input}
        placeholder="New Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />

      {/* <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        disabled={loading}
        onPress={handleReset}
      >
        <Text style={styles.buttonText}>{loading ? "Resetting..." : "Reset Password"}</Text>
      </TouchableOpacity> */}
    <PrimaryButton title={loading ? "Resetting..." : "Reset Password"} onPress={handleReset} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 25,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },
  email: {
    fontWeight: "600",
    color: "#000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 14,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
});

import React, { useState } from "react";
import { 
  Text, 
  TextInput, 
  Alert, 
  StyleSheet, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { apiResetPassword } from "@/services/AuthService";
import { Ionicons } from "@expo/vector-icons";

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
      
      if (res.status || res.success) {
        Alert.alert("Success", "Password reset successfully.", [
          { text: "Login", onPress: () => router.replace("/login") },
        ]);
      } else {
        Alert.alert("Error", res.message || "Unable to reset password.");
      }
    } catch {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contentCard}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="refresh-circle-outline" size={40} color="#4f46e5" />
                    </View>

                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.subtitle}>
                        Setting new password for:{"\n"}
                        <Text style={styles.emailText}>{email}</Text>
                    </Text>

                    <View style={styles.form}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />

                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry
                            value={confirm}
                            onChangeText={setConfirm}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.resetBtn, loading && { opacity: 0.7 }]} 
                        onPress={handleReset} 
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.resetBtnText}>Update Password</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: '#1e293b',
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#64748b",
    marginBottom: 32,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  emailText: {
    color: '#1e293b',
    fontWeight: "700",
  },
  form: {
    width: '100%',
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
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    width: '100%',
    marginBottom: 20,
  },
  resetBtn: {
    backgroundColor: '#4f46e5',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 10,
  },
  resetBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
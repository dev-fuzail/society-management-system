// app/reset-password.tsx
import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Alert, 
  StyleSheet, 
  KeyboardAvoidingView, // ✅ Added
  Platform,             // ✅ Added
  ScrollView,           // ✅ Added
  useColorScheme        // ✅ Added
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { apiResetPassword } from "@/services/AuthService";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Image } from 'expo-image';

export default function ResetPasswordScreen() {
  const { token, email } = useLocalSearchParams<{ token: string; email: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // 🎨 Theme Logic (Text Visibility Fix)
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Colors define kar rahe hain
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const bgColor = isDark ? '#000000' : '#FFFFFF';
  const inputBg = isDark ? '#1C1C1E' : '#F5F5F5';
  const borderColor = isDark ? '#333' : '#ccc';
  const placeholderColor = isDark ? '#888' : '#666';

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
      
      // ✅ Check both success and status just to be safe
      if (res.status || res.success) {
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
    // ✅ 1. Keyboard Handling Wrapper
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bgColor }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      {/* ✅ 2. ScrollView for Scrolling Content */}
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('@/assets/images/logo.png')}
          style={{ width: 120, height: 40, alignSelf: 'center', marginBottom: 24 }}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: textColor }]}>Reset Your Password</Text>
        <Text style={styles.subtitle}>
          For <Text style={[styles.email, { color: textColor }]}>{email}</Text>
        </Text>

        <TextInput
          style={[
            styles.input, 
            { color: textColor, backgroundColor: inputBg, borderColor: borderColor } // ✅ Dynamic Colors
          ]}
          placeholder="New Password"
          placeholderTextColor={placeholderColor}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={[
            styles.input, 
            { color: textColor, backgroundColor: inputBg, borderColor: borderColor } // ✅ Dynamic Colors
          ]}
          placeholder="Confirm Password"
          placeholderTextColor={placeholderColor}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        <PrimaryButton title={loading ? "Resetting..." : "Reset Password"} onPress={handleReset} disabled={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 25,
    // backgroundColor: Removed hardcoded color here, handling in View above
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
    // Color handled inline
  },
  input: {
    borderWidth: 1,
    // Border color handled inline
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  // Button styles are handled by PrimaryButton component
});
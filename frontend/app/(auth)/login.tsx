import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveAuthData } from '@/hooks/helperHooks';
import { PrimaryButton } from '@/components/PrimaryButton';
import { apiLogin, apiVerify2FA } from '@/services/AuthService';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  // 🛡️ 2FA State
  const [is2FAModalVisible, setIs2FAModalVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) router.replace('/(tabs)');
      } catch (err) {
        console.error('Token check error:', err);
      } finally {
        setCheckingToken(false);
      }
    };
    verifyToken();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const response = await apiLogin({ email, password });

      if (response.success) {
        // CASE A: 2FA REQUIRED
        if (response.result.require2FA && response.result.userId) {
          setTempUserId(response.result.userId); // Save ID for next step
          setIs2FAModalVisible(true);     // Show OTP Modal
          Alert.alert("Verification Required", "An OTP has been sent to your email.");
        } 
        // CASE B: NORMAL LOGIN SUCCESS
        else if (response.result) {
          await saveAuthData(response.result.token, response.result.user);
          Alert.alert('Welcome', `Logged in as ${response.result.user.name}`);
          router.replace('/(tabs)');
        }
      } else {
        Alert.alert('Error', response.message || 'Invalid credentials');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || !tempUserId) return;

    try {
      setVerifyingOtp(true);
      const response = await apiVerify2FA(tempUserId, otp);

      if (response.success && response.result) {
        setIs2FAModalVisible(false); // Close Modal
        await saveAuthData(response.result.token, response.result.user);
        router.replace('/(tabs)');
      } else {
        Alert.alert("Error", response.message || "Invalid OTP");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (checkingToken) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={{ width: 120, height: 40, alignSelf: 'center', marginBottom: 24 }}
          resizeMode="contain"
        />

        <Text style={styles.title}>Welcome Back 👋</Text>
        <Text style={styles.subtitle}>Login to continue</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={isDark ? '#888' : '#aaa'}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={isDark ? '#888' : '#aaa'}
            secureTextEntry
          />

          <PrimaryButton title={loading ? "Logging in..." : "Login"} onPress={handleLogin} disabled={loading} />

          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.registerLink}>
              Don’t have an account? <Text style={styles.linkText}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🔐 OTP MODAL */}
      <Modal visible={is2FAModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Verification Code</Text>
            <Text style={styles.modalSubtitle}>Please enter the 6-digit code sent to your email.</Text>
            
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />

            <PrimaryButton 
              title={verifyingOtp ? "Verifying..." : "Verify Code"} 
              onPress={handleVerifyOTP} 
              disabled={verifyingOtp} 
            />

            <TouchableOpacity onPress={() => setIs2FAModalVisible(false)} style={{marginTop: 15}}>
              <Text style={{color: 'red', textAlign:'center'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: isDark ? '#000' : '#fff' },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: isDark ? '#fff' : '#000', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, color: isDark ? '#aaa' : '#666', textAlign: 'center', marginBottom: 30 },
  form: { backgroundColor: isDark ? '#111' : '#f8f8f8', padding: 20, borderRadius: 16, elevation: 3 },
  label: { fontSize: 14, fontWeight: '600', color: isDark ? '#fff' : '#000', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: isDark ? '#444' : '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: isDark ? '#fff' : '#000', marginBottom: 16, backgroundColor: isDark ? '#222' : '#fff' },
  registerLink: { marginTop: 18, textAlign: 'center', color: isDark ? '#aaa' : '#666' },
  linkText: { color: '#3b5998', fontWeight: '600' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: isDark ? '#222' : '#fff', padding: 25, borderRadius: 12, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: isDark ? '#fff' : '#000', textAlign: 'center', marginBottom: 10 },
  modalSubtitle: { color: isDark ? '#aaa' : '#666', textAlign: 'center', marginBottom: 20 },
  otpInput: { fontSize: 24, letterSpacing: 5, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 20, color: isDark ? '#fff' : '#000' }
});
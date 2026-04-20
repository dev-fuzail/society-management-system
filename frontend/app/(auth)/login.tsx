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
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveAuthData } from '@/hooks/helperHooks';
import { apiLogin, apiVerify2FA } from '@/services/AuthService';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const styles = getStyles();

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
        const token = await AsyncStorage.getItem('authToken');
        if (token) router.replace('/(tabs)');
      } catch (err) {
        console.error('Token check error:', err);
      } finally {
        setCheckingToken(false);
      }
    };
    verifyToken();
  }, [router]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const response = await apiLogin({ email, password });

      if (response.success) {
        if (response.result.require2FA && response.result.userId) {
          setTempUserId(response.result.userId);
          setIs2FAModalVisible(true);
          Alert.alert("Verification Required", "An OTP has been sent to your email.");
        }
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
        setIs2FAModalVisible(false);
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentCard}>
            <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
            />

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to manage your society</Text>

            <View style={styles.form}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="resident@example.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                />

                <TouchableOpacity
                onPress={() => router.push('/forgot-password')}
                style={styles.forgotPassword}
                >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.loginBtn, loading && { opacity: 0.7 }]} 
                    onPress={handleLogin} 
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Login</Text>}
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => router.push('/register')} style={styles.registerLink}>
                    <Text style={styles.registerText}>
                        New admin? <Text style={styles.linkText}>Register Society</Text>
                    </Text>
                </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 🔐 OTP MODAL */}
      <Modal visible={is2FAModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Verification</Text>
                        <TouchableOpacity onPress={() => setIs2FAModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#1e293b" />
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.modalSubtitle}>Please enter the 6-digit code sent to your email.</Text>

                    <TextInput
                    style={styles.otpInput}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="000000"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                    />

                    <TouchableOpacity
                        style={[styles.loginBtn, verifyingOtp && { opacity: 0.7 }]}
                        onPress={handleVerifyOTP}
                        disabled={verifyingOtp}
                    >
                        {verifyingOtp ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Verify Code</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const getStyles = () => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center'
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  logo: { 
    width: 140, 
    height: 48, 
    alignSelf: 'center', 
    marginBottom: 32 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#1e293b', 
    textAlign: 'center', 
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 15, 
    color: '#64748b', 
    textAlign: 'center', 
    marginBottom: 32,
    fontWeight: '500'
  },
  form: {},
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
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    fontSize: 16, 
    color: '#1e293b', 
    marginBottom: 20 
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: '#4f46e5',
    fontWeight: '700',
    fontSize: 14,
  },
  loginBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerLink: { 
    marginTop: 24, 
    alignItems: 'center' 
  },
  registerText: { 
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500'
  },
  linkText: { 
    color: '#4f46e5', 
    fontWeight: '700' 
  },
  
  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.4)', 
    justifyContent: 'flex-end' 
  },
  modalContainer: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 32, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 20, 
    elevation: 10 
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#1e293b', 
  },
  modalSubtitle: { 
    color: '#64748b', 
    fontSize: 15,
    marginBottom: 32,
    lineHeight: 22,
    fontWeight: '500'
  },
  otpInput: { 
    fontSize: 32, 
    letterSpacing: 8, 
    backgroundColor: '#f8fafc',
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 32, 
    color: '#1e293b',
    fontWeight: '800'
  }
});
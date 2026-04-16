import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { saveAuthData } from '@/hooks/helperHooks';
import { apiRegister } from '@/services/AuthService';

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [societyName, setSocietyName] = useState('');
  const [societyAddress, setSocietyAddress] = useState('');
  const [societyCity, setSocietyCity] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !phone || !societyName || !societyAddress || !societyCity) {
      Alert.alert('Missing Fields', 'Please fill out all fields.');
      return;
    }

    try {
      setLoading(true);
      const response = await apiRegister({
        name,
        email,
        password,
        role: 'admin',
        phone,
        society_name: societyName,
        society_address: societyAddress,
        society_city: societyCity,
      });

      if ((response.success || response.status) && response.result) {
        await saveAuthData(response.result.token, response.result.user);
        Alert.alert('Success', 'Registration successful!', [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
      } else {
        Alert.alert('Alert', response.message || 'Registration failed.');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred.';
      Alert.alert('Alert', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles();

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Society Registration</Text>
          <Text style={styles.subtitle}>Create your management account</Text>

          <View style={styles.formCard}>
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Admin Account</Text>
                <Text style={styles.label}>Full Name</Text>
                <TextInput style={styles.input} placeholder="John Doe" value={name} onChangeText={setName} placeholderTextColor="#94a3b8" />
                <Text style={styles.label}>Email Address</Text>
                <TextInput style={styles.input} placeholder="admin@society.com" value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor="#94a3b8" />
                <Text style={styles.label}>Phone Number</Text>
                <TextInput style={styles.input} placeholder="+1 234 567 890" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#94a3b8" />
                <Text style={styles.label}>Password</Text>
                <TextInput style={styles.input} placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#94a3b8" />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Society Details</Text>
                <Text style={styles.label}>Society Name</Text>
                <TextInput style={styles.input} placeholder="e.g. Skyline Towers" value={societyName} onChangeText={setSocietyName} placeholderTextColor="#94a3b8" />
                <Text style={styles.label}>Full Address</Text>
                <TextInput style={styles.input} placeholder="Building, Street Name" value={societyAddress} onChangeText={setSocietyAddress} placeholderTextColor="#94a3b8" />
                <Text style={styles.label}>City</Text>
                <TextInput style={styles.input} placeholder="City Name" value={societyCity} onChangeText={setSocietyCity} placeholderTextColor="#94a3b8" />
            </View>

            <TouchableOpacity 
                style={[styles.registerBtn, loading && { opacity: 0.7 }]} 
                onPress={handleRegister} 
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerBtnText}>Register Society</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginLink}>
                <Text style={styles.loginText}>
                    Already registered? <Text style={styles.linkText}>Sign In</Text>
                </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    scrollContent: {
      flexGrow: 1,
      padding: 24,
      paddingBottom: 60,
    },
    logo: { 
        width: 120, 
        height: 40, 
        alignSelf: 'center', 
        marginBottom: 24 
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      textAlign: 'center',
      color: '#1e293b',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      textAlign: 'center',
      color: '#64748b',
      marginBottom: 32,
      fontWeight: '500',
    },
    formCard: {
      backgroundColor: '#fff',
      borderRadius: 32,
      padding: 24,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 15,
      elevation: 6,
      borderWidth: 1,
      borderColor: '#f1f5f9',
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '800',
        color: '#4f46e5',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
        marginLeft: 4,
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
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      color: '#1e293b',
      fontSize: 15,
    },
    registerBtn: {
      backgroundColor: '#4f46e5',
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: '#4f46e5',
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
      marginTop: 10,
    },
    registerBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
    loginLink: {
      marginTop: 24,
      alignItems: 'center',
    },
    loginText: {
      color: '#64748b',
      fontSize: 14,
      fontWeight: '500',
    },
    linkText: {
      color: '#4f46e5',
      fontWeight: '700',
    },
  });
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
  useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { apiRegister } from '../services/AuthService';
import { Image } from 'expo-image';
import { saveAuthData } from '@/hooks/helperHooks';
import { PrimaryButton } from '@/components/PrimaryButton';
import { apiRegister } from '@/services/AuthService';

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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

      if (response.status && response.result) {
        // Save token + userData
        await saveAuthData(response.result.token, response.result.user);

        Alert.alert('Success', 'Registration successful!', [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Registration failed.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(isDark);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Logo at top */}
      <Image
        source={require('@/assets/images/logo.png')}
        style={{ width: 120, height: 40, alignSelf: 'center', marginBottom: 24 }}
        resizeMode="contain"
      />

      <Text style={styles.title}>🏢 Society Admin Registration</Text>
      <Text style={styles.subtitle}>Create your society and admin account</Text>

      {/* Admin Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Admin Details</Text>
        <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} placeholderTextColor={isDark ? '#aaa' : '#666'} />
        <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor={isDark ? '#aaa' : '#666'} />
        <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={isDark ? '#aaa' : '#666'} />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={isDark ? '#aaa' : '#666'} />
      </View>

      {/* Society Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏠 Society Details</Text>
        <TextInput style={styles.input} placeholder="Society Name" value={societyName} onChangeText={setSocietyName} placeholderTextColor={isDark ? '#aaa' : '#666'} />
        <TextInput style={styles.input} placeholder="Society Address" value={societyAddress} onChangeText={setSocietyAddress} placeholderTextColor={isDark ? '#aaa' : '#666'} />
        <TextInput style={styles.input} placeholder="City" value={societyCity} onChangeText={setSocietyCity} placeholderTextColor={isDark ? '#aaa' : '#666'} />
      </View>

      <PrimaryButton title={loading ? "Registering..." : "Register"} onPress={handleRegister} disabled={loading} />
      {/* Register Button */}
      {/* <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register Society</Text>}
      </TouchableOpacity> */}

      {/* Login Link */}
      <Text style={styles.link} onPress={() => router.push('/login')}>
        Already have an account? <Text style={styles.linkText}>Login</Text>
      </Text>
    </ScrollView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 24,
      backgroundColor: isDark ? '#111' : '#fff',
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      color: isDark ? '#fff' : '#111',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      textAlign: 'center',
      color: isDark ? '#aaa' : '#555',
      marginBottom: 20,
    },
    section: {
      marginBottom: 20,
      backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
      padding: 15,
      borderRadius: 12,
      shadowColor: isDark ? '#000' : '#ccc',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 5,
      elevation: 3,
    },
    sectionTitle: {
      fontWeight: '600',
      marginBottom: 10,
      color: isDark ? '#fff' : '#111',
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#ccc',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      color: isDark ? '#fff' : '#111',
      backgroundColor: isDark ? '#222' : '#fff',
    },
    button: {
      backgroundColor: '#007AFF',
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
    link: {
      marginTop: 20,
      textAlign: 'center',
      color: isDark ? '#aaa' : '#555',
    },
    linkText: {
      color: '#007AFF',
      fontWeight: '600',
    },
  });

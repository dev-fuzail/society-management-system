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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiLogin } from '../services/AuthService';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  // ✅ 1. Check if token already exists
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          // Token exists → redirect to tabs
          router.replace('/(tabs)');
        }
      } catch (err) {
        console.error('Token check error:', err);
      } finally {
        setCheckingToken(false);
      }
    };
    verifyToken();
  }, []);

  // While checking token → show loader
  if (checkingToken) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ✅ 2. Handle login logic
//   const handleLogin = async () => {
//     if (!email || !password) {
//       Alert.alert('Missing Info', 'Please enter both email and password.');
//       return;
//     }

//     try {
//       setLoading(true);
//       const response = await apiLogin({ email, password });
// console.log("resp: ",response);
//       if (response.status) {
//         // ✅ Save token to AsyncStorage
//         await AsyncStorage.setItem('token', response.result.token);
//         await AsyncStorage.setItem('userData', JSON.stringify(response.result.user));

//         Alert.alert('Welcome', `Logged in as ${response.result.user.name}`);
//         router.replace('/(tabs)'); // ✅ Redirect to main tabs
//       } else {
//         Alert.alert('Error', response.message || 'Invalid credentials');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'An unexpected error occurred.');
//     } finally {
//       setLoading(false);
//     }
//   };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const response = await apiLogin({ email, password });
      console.log("Login Response:", response.status);
      if (response.status) {
        Alert.alert(
          'Welcome',
          `Logged in as ${response.result.user.name}`,
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        Alert.alert('Error', response.message || 'Invalid credentials');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = getStyles(isDark);

  // ✅ 3. Render Login Form
  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <View style={dynamicStyles.container}>
        {/* Logo at top */}
        <Image
          source={require('@/assets/images/logo.png')}
          style={{ width: 120, height: 40, alignSelf: 'center', marginBottom: 24 }}
          resizeMode="contain"
        />

        <Text style={dynamicStyles.title}>Welcome Back 👋</Text>
        <Text style={dynamicStyles.subtitle}>Login to continue</Text>

        <View style={dynamicStyles.form}>
          <Text style={dynamicStyles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={dynamicStyles.input}
            placeholder="Enter your email"
            placeholderTextColor={isDark ? '#888' : '#aaa'}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={dynamicStyles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={dynamicStyles.input}
            placeholder="Enter your password"
            placeholderTextColor={isDark ? '#888' : '#aaa'}
            secureTextEntry
          />

          <TouchableOpacity
            style={dynamicStyles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={dynamicStyles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={dynamicStyles.registerLink}>
              Don’t have an account?{' '}
              <Text style={dynamicStyles.linkText}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isDark ? '#000' : '#fff',
    },
    container: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: isDark ? '#fff' : '#000',
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 15,
      color: isDark ? '#aaa' : '#666',
      textAlign: 'center',
      marginBottom: 30,
    },
    form: {
      backgroundColor: isDark ? '#111' : '#f8f8f8',
      padding: 20,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#444' : '#ccc',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 14,
      fontSize: 15,
      color: isDark ? '#fff' : '#000',
      marginBottom: 16,
      backgroundColor: isDark ? '#222' : '#fff',
    },
    loginButton: {
      backgroundColor: '#3b5998',
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    registerLink: {
      marginTop: 18,
      textAlign: 'center',
      color: isDark ? '#aaa' : '#666',
    },
    linkText: {
      color: '#3b5998',
      fontWeight: '600',
    },
  });

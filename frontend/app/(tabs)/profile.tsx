import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UpdateUser } from '@/services/types';
import { apiUpdateProfile } from '@/services/AuthService';

export default function ProfileScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState(''); // Add phone number state
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // For save loading

    // Load user data from AsyncStorage on mount
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const userDataString = await AsyncStorage.getItem('userData');
                if (userDataString) {
                    const userData = JSON.parse(userDataString);
                    setName(userData.name || '');
                    setEmail(userData.email || '');
                    setPhoneNumber(userData.phoneNumber || ''); // Load phone number
                }
            } catch (error) {
                console.error("Failed to load user data", error);
                Alert.alert("Error", "Could not load profile data.");
            } finally {
                setIsLoading(false);
            }
        };

        loadUserData();
    }, []);

    const handleSave = async () => {
        // 1. Check if passwords match (if they are entered)
        if (password || confirmPassword) {
            if (password !== confirmPassword) {
                Alert.alert('Error', 'Passwords do not match. Please re-enter.');
                return;
            }
            if (password.length < 6) {
                Alert.alert('Error', 'Password must be at least 6 characters long.');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // 2. Prepare data for API
            // Assuming LoginData is { name: string, email: string, phoneNumber?: string, password?: string }
            const profileData: UpdateUser = { name, email, phone: phoneNumber }; // Add phone number to data
            if (password) {
                profileData.password = password;
            }

            // 3. Call API
            const response = await apiUpdateProfile(profileData);

            if (response.status && response.result) {
                // 4. Update local user data in AsyncStorage with fresh data from API
                await AsyncStorage.setItem('userData', JSON.stringify(response.result));

                Alert.alert('Success', 'Profile updated successfully');

                // Clear password fields after successful save
                setPassword('');
                setConfirmPassword('');
            } else {
                throw new Error(response.message || 'Failed to update profile');
            }
        } catch (error: any) {
            console.error("Failed to save user data", error);
            Alert.alert("Error", error.message || "Could not save profile data.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    await AsyncStorage.removeItem('token');
                    await AsyncStorage.removeItem('userData'); // Also clear user data
                    router.replace('/login');
                },
            },
        ]);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Profile Management', headerBackTitle: 'Back' }} />
            <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>

                <View style={styles.avatarContainer}>
                    <Ionicons name="person-circle" size={100} color={theme.tint} />
                </View>

                <View style={styles.form}>
                    <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.icon, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
                        value={name}
                        onChangeText={setName}
                        placeholderTextColor="#999"
                    />

                    <Text style={[styles.label, { color: theme.text }]}>Email</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.icon, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#999"
                    />

                    <Text style={[styles.label, { color: theme.text }]}>Phone Number (optional)</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.icon, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        placeholder="Enter phone number"
                        placeholderTextColor="#999"
                    />

                    <Text style={[styles.label, { color: theme.text }]}>New Password (optional)</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.icon, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="Enter new password"
                        placeholderTextColor="#999"
                    />

                    <Text style={[styles.label, { color: theme.text }]}>Confirm New Password</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.icon, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        placeholder="Confirm new password"
                        placeholderTextColor="#999"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.tint, opacity: isSubmitting ? 0.7 : 1 }]}
                    onPress={handleSave}
                    disabled={isSubmitting}
                >
                    <Text style={styles.buttonText}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.logoutButton]} onPress={handleLogout} disabled={isSubmitting}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    form: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    button: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    logoutButton: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ff3b30',
    },
    logoutText: {
        color: '#ff3b30',
        fontSize: 16,
        fontWeight: '600',
    },
});
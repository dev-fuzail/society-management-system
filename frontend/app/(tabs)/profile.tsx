import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UpdateUser } from '@/services/types';
import { apiUpdateProfile } from '@/services/AuthService';
import { PrimaryButton } from '@/components/PrimaryButton';

export default function ProfileScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const [name, setName] = useState('');
    const [email, setEmail] = useState(''); // Email is not editable
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // For save loading

    // Load user data from AsyncStorage on mount
    useEffect(() => {
        const loadUserData = async () => {
            try {
                let userDataString;
                if (Platform.OS === "web") {
                    userDataString = localStorage.getItem("userData");
                } else {
                    userDataString = await AsyncStorage.getItem("userData");
                }

                if (userDataString) {
                    const userData = JSON.parse(userDataString);
                    setName(userData.name || "");
                    setEmail(userData.email || "");
                    setPhoneNumber(userData.phone || "");
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
        setIsSubmitting(true);

        try {
            // The backend endpoint for profile update doesn't handle password changes.
            // We only send name and phone.
            const profileData: UpdateUser = { name, phone: phoneNumber };

            const response = await apiUpdateProfile(profileData);

            if (response.success && response.result?.user) {
                const updatedUser = response.result.user;

                // Update state to reflect changes instantly
                setName(updatedUser.name);
                setPhoneNumber(updatedUser.phone);

                // Save updated user data back to storage
                const dataString = JSON.stringify(updatedUser);
                if (Platform.OS === "web") {
                    localStorage.setItem("userData", dataString);
                } else {
                    await AsyncStorage.setItem("userData", dataString);
                }

                Alert.alert("Success", "Profile updated successfully!");

            } else {
                throw new Error(response.message || "Failed to update profile");
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
                    if (Platform.OS === 'web') {
                        localStorage.removeItem('token');
                        localStorage.removeItem('userData');
                    } else {
                        await AsyncStorage.removeItem('token');
                        await AsyncStorage.removeItem('userData');
                    }
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
                        editable={false} // Email should not be editable
                        placeholderTextColor="#999"
                    />

                    <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.icon, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        placeholder="Enter your phone number"
                        placeholderTextColor="#999"
                    />
                </View>

                <PrimaryButton title={isSubmitting ? 'Saving...' : 'Save Changes'} onPress={handleSave} disabled={isSubmitting} />

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
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    logoutButton: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ff3b30',
        marginTop: 20,
    },
    logoutText: {
        color: '#ff3b30',
        fontSize: 16,
        fontWeight: '600',
    },
});
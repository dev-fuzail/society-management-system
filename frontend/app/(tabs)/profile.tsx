import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UpdateUser } from '@/services/types';
import { apiToggle2FA, apiUpdateProfile } from '@/services/AuthService';

export default function ProfileScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);

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
                    setIsTwoFactorEnabled(userData.isTwoFactorEnabled || false);
                }
            } catch {
                Alert.alert("Error", "Could not load profile data.");
            } finally {
                setIsLoading(false);
            }
        };
        loadUserData();
    }, []);

    const handleToggle2FA = async (value: boolean) => {
        setIsTwoFactorEnabled(value);
        try {
            const response = await apiToggle2FA(value);
            if (response.success) {
                const userDataString = await AsyncStorage.getItem("userData");
                if (userDataString) {
                    const userData = JSON.parse(userDataString);
                    userData.isTwoFactorEnabled = value;
                    await AsyncStorage.setItem("userData", JSON.stringify(userData));
                }
            } else {
                setIsTwoFactorEnabled(!value);
                Alert.alert("Error", "Failed to update 2FA settings.");
            }
        } catch {
            setIsTwoFactorEnabled(!value);
            Alert.alert("Error", "Network error.");
        }
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const profileData: UpdateUser = { name, phone: phoneNumber };
            const response = await apiUpdateProfile(profileData);

            if (response.success && response.result?.user) {
                const updatedUser = response.result.user;
                setName(updatedUser.name);
                setPhoneNumber(updatedUser.phone);
                const dataString = JSON.stringify(updatedUser);
                if (Platform.OS === "web") {
                    localStorage.setItem("userData", dataString);
                } else {
                    await AsyncStorage.setItem("userData", dataString);
                }
                Alert.alert("Success", "Profile updated successfully!");
            }
        } catch {
            Alert.alert("Error", "Could not save profile data.");
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
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('userData');
                    } else {
                        await AsyncStorage.removeItem('authToken');
                        await AsyncStorage.removeItem('userData');
                    }
                    // router.replace('/login'); // Note: Navigation will be handled by RootLayout state
                },
            },
        ]);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: '#f8fafc' }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            <View style={styles.headerCard}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarBox}>
                        <Ionicons name="person" size={50} color="#4f46e5" />
                    </View>
                    <Text style={styles.profileName}>{name}</Text>
                    <Text style={styles.profileEmail}>{email}</Text>
                </View>
            </View>

            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Security Settings</Text>
                <View style={styles.settingRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
                        <Text style={styles.settingDescription}>
                            Secure your account with Email OTP.
                        </Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#e2e8f0", true: "#4f46e5" }}
                        thumbColor={"#fff"}
                        ios_backgroundColor="#e2e8f0"
                        onValueChange={handleToggle2FA}
                        value={isTwoFactorEnabled}
                    />
                </View>
            </View>

            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <View style={styles.form}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Your Name"
                        placeholderTextColor="#94a3b8"
                    />

                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        placeholder="Enter phone number"
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    headerCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#f1f5f9' },
    avatarContainer: { alignItems: 'center' },
    avatarBox: { width: 100, height: 100, borderRadius: 32, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    profileName: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
    profileEmail: { fontSize: 14, color: '#64748b', fontWeight: '500' },
    sectionCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#f1f5f9' },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
    form: { marginBottom: 10 },
    label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, fontSize: 16, color: '#1e293b', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    saveBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4, marginTop: 10 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    settingLabel: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
    settingDescription: { fontSize: 12, color: '#64748b', fontWeight: '500' },
    logoutButton: { flexDirection: 'row', padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fee2e2', backgroundColor: '#fff', marginTop: 10 },
    logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
});
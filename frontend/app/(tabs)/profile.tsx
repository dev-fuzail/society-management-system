import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from 'expo-router';
import { UpdateUser } from '@/services/types';
import { apiToggle2FA, apiUpdateProfile } from '@/services/AuthService';
import { clearAuthData } from '@/hooks/helperHooks';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

export default function ProfileScreen() {
    const theme = useTheme();
    const s = makeStyles(theme);
    const router = useRouter();
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
            { text: 'Logout', style: 'destructive', onPress: async () => { await clearAuthData(); router.replace('/login'); } },
        ]);
    };

    if (isLoading) {
        return (
            <View style={[s.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={[s.container, { backgroundColor: theme.bg }]} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

            <View style={[s.headerCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <View style={[s.avatarBox, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name="person" size={50} color={theme.primary} />
                </View>
                <Text style={[s.profileName, { color: theme.text }]}>{name}</Text>
                <Text style={[s.profileEmail, { color: theme.textSecondary }]}>{email}</Text>
            </View>

            <View style={[s.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <Text style={[s.sectionTitle, { color: theme.text }]}>Security Settings</Text>
                <View style={[s.settingRow, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.settingLabel, { color: theme.text }]}>Two-Factor Authentication</Text>
                        <Text style={[s.settingDesc, { color: theme.textSecondary }]}>Secure your account with Email OTP.</Text>
                    </View>
                    <Switch
                        trackColor={{ false: theme.border, true: theme.primary }}
                        thumbColor="#fff"
                        ios_backgroundColor={theme.border}
                        onValueChange={handleToggle2FA}
                        value={isTwoFactorEnabled}
                    />
                </View>
            </View>

            <TouchableOpacity style={s.actionLink} onPress={() => router.push('/invoices')}>
                <Ionicons name="receipt-outline" size={18} color={theme.primary} />
                <Text style={[s.actionLinkText, { color: theme.primary }]}>View Invoices</Text>
            </TouchableOpacity>

            <View style={[s.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <Text style={[s.sectionTitle, { color: theme.text }]}>Personal Information</Text>

                <Text style={[s.label, { color: theme.textSecondary }]}>Full Name</Text>
                <TextInput
                    style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your Name"
                    placeholderTextColor={theme.textMuted}
                />

                <Text style={[s.label, { color: theme.textSecondary }]}>Phone Number</Text>
                <TextInput
                    style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    placeholder="Enter phone number"
                    placeholderTextColor={theme.textMuted}
                />

                <TouchableOpacity style={[s.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={[s.logoutBtn, { backgroundColor: theme.surface, borderColor: '#fee2e2' }]} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color={theme.danger} style={{ marginRight: 8 }} />
                <Text style={[s.logoutText, { color: theme.danger }]}>Log Out</Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

function makeStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: { flex: 1 },
        content: { padding: 20, paddingBottom: 40 },
        headerCard: { borderRadius: 24, padding: 30, alignItems: 'center', marginBottom: 20, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
        avatarBox: { width: 96, height: 96, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
        profileName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
        profileEmail: { fontSize: 14, fontWeight: '500' },
        sectionCard: { borderRadius: 24, padding: 22, marginBottom: 18, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
        sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 16 },
        settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1 },
        settingLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
        settingDesc: { fontSize: 12, fontWeight: '500' },
        label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 2 },
        input: { borderRadius: 14, padding: 16, fontSize: 15, marginBottom: 18, borderWidth: 1 },
        saveBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
        saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
        logoutBtn: { flexDirection: 'row', padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginTop: 4, marginBottom: 20 },
        logoutText: { fontSize: 15, fontWeight: '700' },
        actionLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
        actionLinkText: { fontSize: 15, fontWeight: '700' },
    });
}

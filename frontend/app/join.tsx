import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
} from "react-native";
import { apiRegisterFromInvite, apiVerifyInvite } from "../services/AuthService";
import { InviteData } from "../services/types";
import { saveAuthData } from "@/hooks/helperHooks";

export default function JoinScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [invite, setInvite] = useState<InviteData | null>(null);
    const [error, setError] = useState("");
    const [apartmentName, setApartmentName] = useState("");
    const [floor, setFloor] = useState("");
    const [block, setBlock] = useState("");

    const token = params.token as string;

    useEffect(() => {
        if (!token) {
            Alert.alert("Invalid Link", "No invitation token was provided.");
            setLoading(false);
            return;
        }
        const verifyInvite = async () => {
            try {
                const response = await apiVerifyInvite(token);
                if (response.success && response.result) {
                    setInvite(response.result.invite);
                } else {
                    setError(response.message || "Invalid or expired invite token.");
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        verifyInvite();
    }, [token]);

    const handleJoin = async () => {
        if (!name || !password || !phone || !invite) {
            Alert.alert("Missing Information", "Please fill in all fields.");
            return;
        }

        setSubmitting(true);

        try {
            const response = await apiRegisterFromInvite({
                name,
                email: invite.email || email,
                role: invite.role,
                phone,
                password,
                token,
                apartment_name: apartmentName,
                floor: Number(floor),
                block
            });

            if (response.success) {
                await saveAuthData(response.result.token, response.result.user);
                Alert.alert("Success", "You have successfully joined the society!", [
                    { text: "OK", onPress: () => router.replace("/login") },
                ]);
            } else {
                Alert.alert("Error", response.message || "Something went wrong");
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
            Alert.alert("Error", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text style={styles.loadingText}>Verifying your invitation...</Text>
            </View>
        );
    }

    if (!invite) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error || "Invite not valid or expired"}</Text>
            </View>
        );
    }

  return (
    <View style={styles.container}>
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Home</Text>
                    <Text style={styles.subtitle}>Complete your registration to join the society.</Text>
                </View>

                <View style={styles.formCard}>
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Personal Details</Text>
                        {invite.email ? (
                            <View style={styles.readOnlyContainer}>
                                <Text style={styles.label}>Email Address</Text>
                                <Text style={styles.readOnlyText}>{invite.email}</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.label}>Email Address</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="resident@example.com"
                                    placeholderTextColor="#94a3b8"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </>
                        )}

                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your name"
                            placeholderTextColor="#94a3b8"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />

                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+1 234 567 890"
                            placeholderTextColor="#94a3b8"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                        />

                        <Text style={styles.label}>Create Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Unit Details</Text>
                        <Text style={styles.label}>Apartment Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. A-101"
                            placeholderTextColor="#94a3b8"
                            value={apartmentName}
                            onChangeText={setApartmentName}
                        />

                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Floor</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="number-pad"
                                    value={floor}
                                    onChangeText={setFloor}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Block</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Block"
                                    placeholderTextColor="#94a3b8"
                                    value={block}
                                    onChangeText={setBlock}
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
                        onPress={handleJoin} 
                        disabled={submitting}
                    >
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Complete Registration</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8fafc",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#64748b",
        fontWeight: '500',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingBottom: 60,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        color: "#1e293b",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: "#64748b",
        fontWeight: '500',
        lineHeight: 22,
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 32,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '800',
        color: '#4f46e5',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 20,
        marginLeft: 4,
    },
    label: {
        fontSize: 13,
        fontWeight: "700",
        color: "#475569",
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        color: "#1e293b",
        fontSize: 16,
    },
    readOnlyContainer: {
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
    },
    readOnlyText: {
        fontSize: 16,
        color: "#64748b",
        fontWeight: '600',
    },
    submitBtn: {
        backgroundColor: "#4f46e5",
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: '#4f46e5',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
        marginTop: 10,
    },
    submitBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
    errorText: {
        textAlign: "center",
        color: "#ef4444",
        fontSize: 18,
        fontWeight: "700",
        padding: 40,
    },
});
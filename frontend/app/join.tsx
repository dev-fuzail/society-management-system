import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { apiRegisterFromInvite, apiVerifyInvite } from "../services/AuthService";
import { InviteData } from "../services/types";

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
                if (response.status) {
                    setInvite(response.result.invite);
                } else {
                    setError(response.message || "Invalid or expired invite token.");
                    Alert.alert("Error", response.message || "Invalid or expired invite token.");
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
                setError(errorMessage);
                Alert.alert("Error", errorMessage);
            } finally {
                setLoading(false);
            }
        };

        verifyInvite();
    }, [token]);

    const handleRegister = async () => {
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
            });

            if (response.status) {
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
                <ActivityIndicator size="large" color="#FFD671" />
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
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>🤝 Join Society</Text>
            <Text style={styles.subtitle}>You're invited to join. Complete your details below.</Text>

            <View style={styles.section}>
                {invite.email ? (
                    <>
                        <Text style={styles.label}>Email Address (from invite)</Text>
                        <TextInput
                            style={[styles.input, styles.readonlyInput]}
                            value={invite.email}
                            editable={false}
                        />
                    </>
                ) : (
                    <>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email address"
                            placeholderTextColor="#777"
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
                    placeholder="Enter your full name"
                    placeholderTextColor="#777"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                />

                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#777"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Create a strong password"
                    placeholderTextColor="#777"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />
            </View>

            <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={submitting}
            >
                {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Create Account</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0a0a0a",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#bdbdbd",
    },
    container: {
        flexGrow: 1,
        padding: 24,
        backgroundColor: "#0a0a0a",
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 8,
        textAlign: "center",
        color: "#FFD671",
    },
    subtitle: {
        fontSize: 14,
        textAlign: "center",
        color: "#bdbdbd",
        marginBottom: 24,
    },
    section: {
        marginBottom: 20,
        backgroundColor: "#1a1a1a",
        padding: 20,
        borderRadius: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#fff",
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: "#333",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        backgroundColor: "#121212",
        color: "#fff",
        fontSize: 15,
    },
    readonlyInput: {
        backgroundColor: "#222",
        color: "#999",
    },
    button: {
        backgroundColor: "#FFD671",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: "#000",
        fontWeight: "700",
        fontSize: 16,
    },
    errorText: {
        textAlign: "center",
        color: "#ff6b6b",
        fontSize: 18,
        fontWeight: "600",
    },
});

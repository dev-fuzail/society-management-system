import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiForgetPassword } from '@/services/AuthService';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReset = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiForgetPassword(email);

            if (response.success || response.status) {
                Alert.alert(
                    'Check your email',
                    "If an account exists for this email, we have sent password reset instructions.",
                    [
                        { text: 'OK', onPress: () => router.back() } 
                    ]
                );
            } else {
                throw new Error(response.message || 'Failed to send reset link.');
            }
        } catch (error: any) {
            console.error('Forgot Password Error:', error);
            Alert.alert('Error', error.message || 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

  return (
    <>
        <Stack.Screen options={{ title: '', headerTransparent: true, headerBackTitle: 'Back' }} />
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.contentCard}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="lock-closed" size={32} color="#4f46e5" />
                        </View>

                        <Text style={styles.title}>Forgot Password?</Text>
                        <Text style={styles.subtitle}>
                            Enter your email address and we&apos;ll send you a link to reset your password.
                        </Text>

                        <View style={styles.form}>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="resident@example.com"
                                placeholderTextColor="#94a3b8"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.resetBtn, isSubmitting && { opacity: 0.7 }]} 
                            onPress={handleReset} 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.resetBtnText}>Send Reset Link</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                            <Text style={styles.backText}>Return to <Text style={styles.linkText}>Sign In</Text></Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    </>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    contentCard: {
        backgroundColor: '#fff',
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 28,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
        fontWeight: '500',
    },
    form: {
        width: '100%',
        marginBottom: 10,
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
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: '#1e293b',
        width: '100%',
        marginBottom: 20,
    },
    resetBtn: {
        backgroundColor: '#4f46e5',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
        marginTop: 10,
    },
    resetBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    backLink: {
        marginTop: 24,
    },
    backText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500',
    },
    linkText: {
        color: '#4f46e5',
        fontWeight: '700',
    },
});
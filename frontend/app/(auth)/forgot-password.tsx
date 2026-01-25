import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView // ✅ Added ScrollView
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { apiForgetPassword } from '@/services/AuthService';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Image } from 'expo-image';

export default function ForgotPasswordScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
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

            if (response.status) {
                if (response.result.resetUrl) {
                    router.push(`/reset-password?token=${response.result.resetUrl.split("token=")[1].split("&")[0]}&email=${email}`);
                } else {
                    Alert.alert(
                        'Check your email',
                        'If an account exists for this email, we have sent password reset instructions.',
                        [{ text: 'OK', onPress: () => router.back() }]
                    );
                }
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
            <Stack.Screen options={{ title: 'Reset Password', headerBackTitle: 'Back' }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.container, { backgroundColor: theme.background }]}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} // ✅ Header height adjustment
            >
                {/* ✅ Added ScrollView to allow scrolling when keyboard opens */}
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Image
                        source={require('@/assets/images/logo.png')}
                        style={{ width: 120, height: 40, alignSelf: 'center', marginBottom: 24 }}
                        resizeMode="contain"
                    />
                    <Ionicons name="lock-closed-outline" size={64} color={theme.tint} style={styles.icon} />

                    <Text style={[styles.title, { color: theme.text }]}>Forgot Password?</Text>
                    <Text style={[styles.subtitle, { color: theme.icon }]}>
                        Enter your email address and we'll send you a link to reset your password.
                    </Text>

                    <View style={styles.form}>
                        <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.icon, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <PrimaryButton title={isSubmitting ? "Sending..." : "Send Reset Link"} onPress={handleReset} disabled={isSubmitting} />
                </ScrollView>
            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // ✅ Replaced 'content' with 'scrollContent' for ScrollView
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
        paddingBottom: 100 // ✅ Extra padding for keyboard
    },
    icon: {
        alignSelf: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    form: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
    },
});
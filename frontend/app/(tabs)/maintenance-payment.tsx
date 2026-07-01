import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { API_BASE } from '@/services/ApiService';
import { apiGetInvoiceById } from '@/services/InvoiceService';
import { InvoiceItem } from '@/services/types';

export default function MaintenancePaymentScreen() {
  const params = useLocalSearchParams<{ invoiceId?: string; status?: string }>();
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState<string>(typeof params.invoiceId === 'string' ? params.invoiceId : '');
  const [invoice, setInvoice] = useState<InvoiceItem | null>(null);
  const [loading, setLoading] = useState(Boolean(invoiceId));
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (typeof params.invoiceId === 'string') {
      setInvoiceId(params.invoiceId);
    }
  }, [params.invoiceId]);

  useEffect(() => {
    if (params.status === 'success') {
      Alert.alert('Payment successful', 'Your maintenance payment was completed.');
      setShowCheckout(false);
      loadInvoice();
    } else if (params.status === 'failure') {
      Alert.alert('Payment failed', 'The payment could not be completed. Please try again.');
      setShowCheckout(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.status]);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const invoiceRes = await apiGetInvoiceById(invoiceId);

      if (invoiceRes.success && invoiceRes.result) {
        setInvoice(invoiceRes.result);
      } else {
        Alert.alert('Error', invoiceRes.message || 'Failed to load invoice.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not load payment information.');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId, loadInvoice]);

  const checkoutUrl = useMemo(() => {
    const base = API_BASE.replace(/\/+$/, '');
    return `${base}/api/payments/payfast/checkout/${invoiceId}`;
  }, [invoiceId]);

  const handleNavigationChange = useCallback((navState: WebViewNavigation) => {
    if (navState.url.includes('/payments/payfast/success') || navState.url.includes('status=success')) {
      setShowCheckout(false);
      Alert.alert('Payment successful', 'Your maintenance payment was completed.');
      loadInvoice();
    } else if (navState.url.includes('/payments/payfast/failure') || navState.url.includes('status=failure')) {
      setShowCheckout(false);
      Alert.alert('Payment failed', 'The payment could not be completed. Please try again.');
    }
  }, [loadInvoice]);

  if (showCheckout && invoiceId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'PayFast Checkout',
            headerLeft: () => (
              <TouchableOpacity onPress={() => setShowCheckout(false)} style={styles.headerBackBtn}>
                <Ionicons name="arrow-back" size={24} color="#0f172a" />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.container}>
          <WebView
            source={{ uri: checkoutUrl }}
            onNavigationStateChange={handleNavigationChange}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Pay Maintenance',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>

      {!invoiceId ? (
        <View style={styles.centered}>
          <Text style={styles.title}>Open an invoice</Text>
          <TextInput
            style={styles.input}
            value={invoiceId}
            onChangeText={setInvoiceId}
            placeholder="Paste invoice ID"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={loadInvoice}>
            <Text style={styles.primaryButtonText}>Load Invoice</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.helper}>Loading invoice...</Text>
        </View>
      ) : invoice ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Maintenance Payment</Text>
          <Text style={styles.amount}>{invoice.currency} {invoice.amount}</Text>
          <Text style={styles.meta}>Invoice: {invoice._id}</Text>
          <Text style={styles.meta}>Status: {invoice.status}</Text>
          {invoice.status === 'paid' ? (
            <Text style={styles.helper}>This invoice has already been paid.</Text>
          ) : (
            <TouchableOpacity style={styles.payButton} onPress={() => setShowCheckout(true)}>
              <Text style={styles.payButtonText}>Pay with PayFast</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.title}>Payment unavailable</Text>
          <Text style={styles.helper}>The invoice could not be loaded.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  headerBackBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  centered: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  helper: { color: '#64748b', fontSize: 14, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, color: '#0f172a' },
  primaryButton: { backgroundColor: '#2563eb', padding: 16, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  amount: { fontSize: 30, fontWeight: '900', color: '#2563eb', marginBottom: 10 },
  meta: { color: '#475569', marginBottom: 4 },
  payButton: { marginTop: 20, backgroundColor: '#0f766e', padding: 16, borderRadius: 14, alignItems: 'center' },
  payButtonText: { color: '#fff', fontWeight: '700' },
});

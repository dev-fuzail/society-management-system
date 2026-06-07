import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, TextInput, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { apiCreateStripePaymentIntent } from '@/services/PaymentService';
import { apiGetInvoiceById } from '@/services/InvoiceService';
import { InvoiceItem } from '@/services/types';

function PaymentSheetFlow({ invoice, publishableKey, clientSecret }: { invoice: InvoiceItem; publishableKey: string; clientSecret: string }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [sheetReady, setSheetReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { error } = await initPaymentSheet({
        merchantDisplayName: invoice.society_id || 'Society Payment',
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: false,
      });

      if (error) {
        Alert.alert('Stripe error', error.message);
        return;
      }

      setSheetReady(true);
    };

    init();
  }, [clientSecret, initPaymentSheet, invoice.society_id]);

  const handlePay = async () => {
    try {
      setSubmitting(true);
      const { error } = await presentPaymentSheet();
      if (error) {
        Alert.alert('Payment failed', error.message);
        return;
      }

      Alert.alert('Payment successful', 'Your maintenance payment was completed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Maintenance Payment</Text>
      <Text style={styles.amount}>{invoice.currency} {invoice.amount}</Text>
      <Text style={styles.meta}>Invoice: {invoice._id}</Text>
      <Text style={styles.meta}>Status: {invoice.status}</Text>
      <TouchableOpacity style={styles.payButton} onPress={handlePay} disabled={!sheetReady || submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Pay Now</Text>}
      </TouchableOpacity>
    </View>
  );
}

export default function MaintenancePaymentScreen() {
  const params = useLocalSearchParams<{ invoiceId?: string }>();
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState<string>(typeof params.invoiceId === 'string' ? params.invoiceId : '');
  const [invoice, setInvoice] = useState<InvoiceItem | null>(null);
  const [publishableKey, setPublishableKey] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(Boolean(invoiceId));

  useEffect(() => {
    if (typeof params.invoiceId === 'string') {
      setInvoiceId(params.invoiceId);
    }
  }, [params.invoiceId]);

  const loadPayment = useCallback(async () => {
    if (!invoiceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const invoiceRes = await apiGetInvoiceById(invoiceId);
      const intentRes = await apiCreateStripePaymentIntent(invoiceId);

      if (invoiceRes.success && invoiceRes.result) {
        setInvoice(invoiceRes.result);
      }

      if (intentRes.success && intentRes.result) {
        setPublishableKey(intentRes.result.publishable_key);
        setClientSecret(intentRes.result.client_secret);
      } else {
        Alert.alert('Error', intentRes.message || 'Failed to initialize payment.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not load payment information.');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (invoiceId) {
      loadPayment();
    }
  }, [invoiceId, loadPayment]);

  const canRenderStripe = useMemo(() => Boolean(invoice && publishableKey && clientSecret), [invoice, publishableKey, clientSecret]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Pay Maintenance' }} />

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
          <TouchableOpacity style={styles.primaryButton} onPress={loadPayment}>
            <Text style={styles.primaryButtonText}>Load Invoice</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.helper}>Preparing secure payment sheet...</Text>
        </View>
      ) : canRenderStripe ? (
        <StripeProvider publishableKey={publishableKey} merchantIdentifier={Platform.OS === 'ios' ? 'merchant.com.livingsync' : undefined}>
          <PaymentSheetFlow invoice={invoice!} publishableKey={publishableKey} clientSecret={clientSecret} />
        </StripeProvider>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.title}>Payment unavailable</Text>
          <Text style={styles.helper}>The invoice or Stripe configuration could not be loaded.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
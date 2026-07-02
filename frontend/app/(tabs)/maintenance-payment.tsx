import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { API_BASE } from '@/services/ApiService';
import { apiGetInvoiceById } from '@/services/InvoiceService';
import { InvoiceItem } from '@/services/types';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

export default function MaintenancePaymentScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
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
      <SafeAreaView style={[s.safeArea, { backgroundColor: theme.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[s.checkoutHeader, { backgroundColor: theme.headerBg }]}>
          <TouchableOpacity onPress={() => setShowCheckout(false)} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.checkoutHeaderTitle}>PayFast Checkout</Text>
        </View>
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: checkoutUrl }}
            onNavigationStateChange={handleNavigationChange}
            startInLoadingState
            renderLoading={() => (
              <View style={s.centered}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.header, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Pay Maintenance</Text>
      </View>

      <View style={s.container}>
        {!invoiceId ? (
          <View style={s.centered}>
            <Text style={[s.title, { color: theme.text }]}>Open an invoice</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={invoiceId}
              onChangeText={setInvoiceId}
              placeholder="Paste invoice ID"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
            />
            <TouchableOpacity style={[s.primaryButton, { backgroundColor: theme.primary }]} onPress={loadInvoice}>
              <Text style={s.primaryButtonText}>Load Invoice</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[s.helper, { color: theme.textSecondary }]}>Loading invoice...</Text>
          </View>
        ) : invoice ? (
          <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={[s.cardIconBox, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="receipt-outline" size={28} color={theme.primary} />
            </View>
            <Text style={[s.cardTitle, { color: theme.textSecondary }]}>Maintenance Invoice</Text>
            <Text style={[s.amount, { color: theme.primary }]}>PKR {invoice.amount}</Text>
            <View style={[s.divider, { backgroundColor: theme.borderLight }]} />
            <View style={s.metaRow}>
              <Text style={[s.metaLabel, { color: theme.textMuted }]}>Invoice ID</Text>
              <Text style={[s.metaValue, { color: theme.text }]}>#{invoice._id.slice(-8).toUpperCase()}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={[s.metaLabel, { color: theme.textMuted }]}>Status</Text>
              <View style={[s.statusPill, { backgroundColor: invoice.status === 'paid' ? theme.successLight : theme.warningLight }]}>
                <Text style={[s.statusText, { color: invoice.status === 'paid' ? theme.successText : theme.warningText }]}>
                  {invoice.status.toUpperCase()}
                </Text>
              </View>
            </View>
            {invoice.status === 'paid' ? (
              <View style={[s.paidNote, { backgroundColor: theme.successLight }]}>
                <Ionicons name="checkmark-circle" size={18} color={theme.successText} />
                <Text style={[s.paidNoteText, { color: theme.successText }]}>This invoice has already been paid.</Text>
              </View>
            ) : (
              <TouchableOpacity style={[s.payButton, { backgroundColor: theme.primary }]} onPress={() => setShowCheckout(true)}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                <Text style={s.payButtonText}>Pay with PayFast</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={s.centered}>
            <View style={[s.errorIcon, { backgroundColor: theme.dangerLight }]}>
              <Ionicons name="alert-circle-outline" size={36} color={theme.dangerText} />
            </View>
            <Text style={[s.title, { color: theme.text }]}>Invoice unavailable</Text>
            <Text style={[s.helper, { color: theme.textSecondary }]}>The invoice could not be loaded.</Text>
            <TouchableOpacity style={[s.primaryButton, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
              <Text style={s.primaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 14 },
    checkoutHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 14 },
    backBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    checkoutHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    container: { flex: 1, padding: 20 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
    title: { fontSize: 22, fontWeight: '800' },
    helper: { fontSize: 14, textAlign: 'center' },
    input: { width: '100%', borderRadius: 14, padding: 16, borderWidth: 1, fontSize: 15, marginBottom: 4 },
    primaryButton: { width: '100%', padding: 16, borderRadius: 14, alignItems: 'center' },
    primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    card: { borderRadius: 28, padding: 28, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, elevation: 4 },
    cardIconBox: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    amount: { fontSize: 36, fontWeight: '900', marginBottom: 20 },
    divider: { height: 1, marginBottom: 16 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    metaLabel: { fontSize: 13, fontWeight: '600' },
    metaValue: { fontSize: 13, fontWeight: '700' },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: '800' },
    paidNote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, marginTop: 16 },
    paidNoteText: { fontWeight: '600', fontSize: 14 },
    payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, padding: 18, borderRadius: 16 },
    payButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    errorIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  });
}

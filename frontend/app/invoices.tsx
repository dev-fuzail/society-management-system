import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { apiGetInvoicePdfUrl, apiGetInvoices } from '@/services/InvoiceService';
import { InvoiceItem } from '@/services/types';

export default function InvoicesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInvoices = async () => {
    try {
      const response = await apiGetInvoices({ limit: 50 });
      if (response.success && response.result) {
        setItems(response.result.items || []);
      }
    } catch {
      Alert.alert('Error', 'Unable to load invoices.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleDownload = async (invoiceId: string) => {
    try {
      const url = apiGetInvoicePdfUrl(invoiceId);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Unable to open invoice download link.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInvoices(); }} />}
    >
      <Text style={styles.title}>Invoices</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>No invoices found.</Text>
      ) : (
        items.map((invoice) => (
          <View key={invoice._id} style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.amount}>{invoice.currency} {invoice.amount}</Text>
                <Text style={styles.meta}>Status: {invoice.status}</Text>
                <Text style={styles.meta}>Period: {invoice.period_key || invoice.month || 'N/A'}</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{invoice.type}</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push({ pathname: '/maintenance-payment', params: { invoiceId: invoice._id } })}>
                <Text style={styles.primaryBtnText}>Pay Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleDownload(invoice._id)}>
                <Text style={styles.secondaryBtnText}>Download PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  empty: { color: '#64748b' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amount: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  meta: { color: '#64748b', marginTop: 3 },
  statusPill: { backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#0369a1' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryBtn: { flex: 1, backgroundColor: '#2563eb', padding: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', padding: 14, borderRadius: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#0f172a', fontWeight: '700' },
});
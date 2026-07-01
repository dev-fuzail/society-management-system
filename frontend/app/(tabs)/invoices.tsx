import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal,
  TextInput, Image, KeyboardAvoidingView, Platform, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGetInvoices } from '@/services/InvoiceService';
import { InvoiceItem } from '@/services/types';
import { getAuthData } from '@/hooks/helperHooks';
import { apiGetUserSocieties } from '@/services/SocietyService';
import { EXPO_PUBLIC_API_BASE } from '@/constants';
import * as ImagePicker from 'expo-image-picker';
import { apiUploadFile } from '@/services/ChatService';

interface BankAccount {
  bank_name?: string;
  account_title?: string;
  account_number?: string;
  iban?: string;
}

export default function InvoicesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);

  // Offline payment modal state
  const [offlineModal, setOfflineModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [offlineNotes, setOfflineNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = async () => {
    try {
      const { userData, token } = await getAuthData();
      setIsAdmin(userData?.role === 'admin');
      const societyRes = await apiGetUserSocieties(userData.id);
      const sid = societyRes.result?.[0]?._id;
      if (sid) {
        setSocietyId(sid);
        const [invRes, bankRes] = await Promise.all([
          apiGetInvoices({ limit: 50 }),
          fetch(`${EXPO_PUBLIC_API_BASE}/api/payments/bank-account/${sid}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
        ]);
        if (invRes.success) setItems(invRes.result?.items || []);
        if (bankRes.success) setBankAccount(bankRes.result?.bank_account);
      }
    } catch {
      Alert.alert('Error', 'Unable to load invoices.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const pickScreenshot = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    try {
      const url = await apiUploadFile({ uri: asset.uri, name: `payment-${Date.now()}.jpg`, mimeType: 'image/jpeg' });
      setScreenshotUrl(url);
    } catch {
      Alert.alert('Upload Failed', 'Could not upload screenshot.');
    }
  };

  const submitOffline = async () => {
    if (!screenshotUrl) return Alert.alert('Required', 'Please attach a payment screenshot.');
    if (!selectedInvoice || !societyId) return;
    setSubmitting(true);
    try {
      const { token } = await getAuthData();
      const res = await fetch(`${EXPO_PUBLIC_API_BASE}/api/payments/offline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: selectedInvoice._id,
          society_id: societyId,
          screenshot_url: screenshotUrl,
          notes: offlineNotes.trim(),
        }),
      }).then(r => r.json());
      if (res.success) {
        Alert.alert('Submitted', 'Your payment screenshot has been submitted for admin review.');
        setOfflineModal(false);
        setScreenshotUrl(null);
        setOfflineNotes('');
        setSelectedInvoice(null);
      } else {
        Alert.alert('Error', res.message);
      }
    } catch {
      Alert.alert('Error', 'Failed to submit payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const openOfflineModal = (invoice: InvoiceItem) => {
    if (!bankAccount?.account_number) {
      if (isAdmin) {
        Alert.alert(
          'Bank Account Not Set',
          'Set up your society bank account first so residents can see where to transfer.',
          [
            { text: 'Set Up Now', onPress: () => router.push('/society-update' as any) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert(
          'Offline Payments Unavailable',
          'Your society admin has not configured bank account details yet. Please contact them or use online payment.',
          [{ text: 'OK' }]
        );
      }
      return;
    }
    setSelectedInvoice(invoice);
    setOfflineModal(true);
  };

  const screenHeader = (
    <Stack.Screen options={{
      headerShown: true, title: 'Invoices',
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
      ),
    }} />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {screenHeader}
        <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {screenHeader}
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Bank Account Info Card (if set) */}
        {bankAccount?.account_number && (
          <View style={styles.bankCard}>
            <View style={styles.bankCardHeader}>
              <Ionicons name="business-outline" size={18} color="#1d4ed8" />
              <Text style={styles.bankCardTitle}>Society Bank Account</Text>
            </View>
            <Text style={styles.bankHint}>For offline payments, transfer to:</Text>
            {[
              { label: 'Bank', value: bankAccount.bank_name },
              { label: 'Account Title', value: bankAccount.account_title },
              { label: 'Account No.', value: bankAccount.account_number },
              { label: 'IBAN', value: bankAccount.iban },
            ].filter(f => f.value).map(f => (
              <TouchableOpacity key={f.label} style={styles.bankRow} onPress={() => copyToClipboard(f.value!, f.label)}>
                <Text style={styles.bankLabel}>{f.label}</Text>
                <View style={styles.bankValueRow}>
                  <Text style={styles.bankValue}>{f.value}</Text>
                  <Ionicons name="copy-outline" size={14} color="#4f46e5" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {items.length === 0 ? (
          <Text style={styles.empty}>No invoices found.</Text>
        ) : (
          items.map((invoice) => {
            const isPaid = invoice.status === 'paid';
            return (
              <View key={invoice._id} style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.amount}>{invoice.currency} {invoice.amount}</Text>
                    <Text style={styles.meta}>Status: {invoice.status}</Text>
                    <Text style={styles.meta}>Period: {invoice.period_key || invoice.month || 'N/A'}</Text>
                  </View>
                  <View style={[styles.statusPill, isPaid && styles.statusPillPaid]}>
                    <Text style={[styles.statusText, isPaid && styles.statusTextPaid]}>{invoice.type}</Text>
                  </View>
                </View>

                {!isPaid && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push({ pathname: '/maintenance-payment', params: { invoiceId: invoice._id } })}>
                      <Ionicons name="card-outline" size={15} color="#fff" />
                      <Text style={styles.primaryBtnText}>Pay Online</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.offlineBtn} onPress={() => openOfflineModal(invoice)}>
                      <Ionicons name="camera-outline" size={15} color="#7c3aed" />
                      <Text style={styles.offlineBtnText}>Pay Offline</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {isPaid && (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                    <Text style={styles.paidText}>Paid</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Offline Payment Modal */}
      <Modal visible={offlineModal} transparent animationType="slide" onRequestClose={() => setOfflineModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setOfflineModal(false)} />
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pay Offline</Text>
                <TouchableOpacity onPress={() => setOfflineModal(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {selectedInvoice && (
                <View style={styles.invoiceSummary}>
                  <Text style={styles.invoiceSummaryAmount}>{selectedInvoice.currency} {selectedInvoice.amount}</Text>
                  <Text style={styles.invoiceSummaryPeriod}>{selectedInvoice.period_key || selectedInvoice.month}</Text>
                </View>
              )}

              {/* Bank details — or notice if not set */}
              {bankAccount?.account_number ? (
                <View style={styles.bankInfoBox}>
                  <Text style={styles.bankInfoTitle}>Transfer to this account:</Text>
                  {[
                    { label: 'Bank', value: bankAccount.bank_name },
                    { label: 'Account Title', value: bankAccount.account_title },
                    { label: 'Account No.', value: bankAccount.account_number },
                    { label: 'IBAN', value: bankAccount.iban },
                  ].filter(f => f.value).map(f => (
                    <TouchableOpacity key={f.label} style={styles.bankRow} onPress={() => copyToClipboard(f.value!, f.label)}>
                      <Text style={styles.bankLabel}>{f.label}</Text>
                      <View style={styles.bankValueRow}>
                        <Text style={styles.bankValue}>{f.value}</Text>
                        <Ionicons name="copy-outline" size={13} color="#4f46e5" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.noBankBox}>
                  <Ionicons name="information-circle-outline" size={22} color="#92400e" />
                  <Text style={styles.noBankText}>Bank account not configured yet. Contact your society admin to set up bank details.</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Attach Payment Screenshot *</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickScreenshot}>
                <Ionicons name="cloud-upload-outline" size={22} color="#4f46e5" />
                <Text style={styles.uploadBtnText}>{screenshotUrl ? 'Change Screenshot' : 'Upload Screenshot'}</Text>
              </TouchableOpacity>
              {screenshotUrl && (
                <Image source={{ uri: screenshotUrl }} style={styles.previewImage} />
              )}

              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Transfer ID, date, bank branch..."
                placeholderTextColor="#94a3b8"
                value={offlineNotes}
                onChangeText={setOfflineNotes}
                multiline
                returnKeyType="done"
              />

              <TouchableOpacity
                style={[styles.submitBtn, (!screenshotUrl || submitting) && { opacity: 0.5 }]}
                onPress={submitOffline}
                disabled={submitting || !screenshotUrl}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>Submit for Approval</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  headerBackBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },

  bankCard: {
    backgroundColor: '#eff6ff', borderRadius: 16, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#bfdbfe',
  },
  bankCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  bankCardTitle: { fontSize: 15, fontWeight: '800', color: '#1d4ed8' },
  bankHint: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  bankRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#dbeafe',
  },
  bankLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  bankValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bankValue: { fontSize: 13, fontWeight: '600', color: '#1e293b' },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amount: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  meta: { color: '#64748b', marginTop: 3 },
  statusPill: { backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusPillPaid: { backgroundColor: '#dcfce7' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#0369a1' },
  statusTextPaid: { color: '#15803d' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2563eb', padding: 13, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  offlineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', padding: 13, borderRadius: 12 },
  offlineBtnText: { color: '#7c3aed', fontWeight: '700', fontSize: 13 },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  paidText: { color: '#15803d', fontWeight: '700', fontSize: 13 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 32, maxHeight: '88%',
  },
  bankInfoBox: {
    backgroundColor: '#eff6ff', borderRadius: 14, padding: 14,
    marginBottom: 20, borderWidth: 1, borderColor: '#bfdbfe',
  },
  bankInfoTitle: { fontSize: 13, fontWeight: '700', color: '#1d4ed8', marginBottom: 10 },
  noBankBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fef3c7', borderRadius: 12, padding: 14,
    marginBottom: 20, borderWidth: 1, borderColor: '#fcd34d',
  },
  noBankText: { flex: 1, fontSize: 13, color: '#92400e', fontWeight: '500', lineHeight: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  invoiceSummary: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  invoiceSummaryAmount: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  invoiceSummaryPeriod: { fontSize: 13, color: '#64748b', marginTop: 2 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#eef2ff', borderRadius: 14, borderWidth: 1, borderColor: '#c7d2fe',
    paddingVertical: 14, marginBottom: 12,
  },
  uploadBtnText: { color: '#4f46e5', fontWeight: '700', fontSize: 14 },
  previewImage: { width: '100%', height: 160, borderRadius: 12, marginBottom: 16 },
  input: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 14, fontSize: 14, color: '#1e293b', marginBottom: 20, minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

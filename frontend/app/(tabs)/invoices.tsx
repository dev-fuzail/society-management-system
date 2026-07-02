import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal,
  TextInput, Image, KeyboardAvoidingView, Platform, Clipboard, Pressable,
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
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

interface BankAccount {
  bank_name?: string;
  account_title?: string;
  account_number?: string;
  iban?: string;
}

export default function InvoicesScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const router = useRouter();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
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

  if (loading) {
    return (
      <SafeAreaView style={[s.safeArea, { backgroundColor: theme.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.centered}><ActivityIndicator size="large" color={theme.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Invoices</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
      >
        {/* Bank Account Info Card */}
        {bankAccount?.account_number && (
          <View style={[s.bankCard, { backgroundColor: theme.infoLight, borderColor: '#bfdbfe' }]}>
            <View style={s.bankCardHeader}>
              <Ionicons name="business-outline" size={18} color={theme.infoText} />
              <Text style={[s.bankCardTitle, { color: theme.infoText }]}>Society Bank Account</Text>
            </View>
            <Text style={[s.bankHint, { color: theme.textSecondary }]}>For offline payments, transfer to:</Text>
            {[
              { label: 'Bank', value: bankAccount.bank_name },
              { label: 'Account Title', value: bankAccount.account_title },
              { label: 'Account No.', value: bankAccount.account_number },
              { label: 'IBAN', value: bankAccount.iban },
            ].filter(f => f.value).map(f => (
              <TouchableOpacity key={f.label} style={[s.bankRow, { borderBottomColor: theme.borderLight }]} onPress={() => copyToClipboard(f.value!, f.label)}>
                <Text style={[s.bankLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                <View style={s.bankValueRow}>
                  <Text style={[s.bankValue, { color: theme.text }]}>{f.value}</Text>
                  <Ionicons name="copy-outline" size={14} color={theme.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {items.length === 0 ? (
          <View style={s.empty}>
            <View style={[s.emptyIcon, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="document-text-outline" size={36} color={theme.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: theme.text }]}>No invoices found</Text>
            <Text style={[s.emptyMsg, { color: theme.textMuted }]}>Your maintenance invoices will appear here.</Text>
          </View>
        ) : (
          items.map((invoice) => {
            const isPaid = invoice.status === 'paid';
            return (
              <View key={invoice._id} style={[s.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.amount, { color: theme.text }]}>PKR {invoice.amount}</Text>
                    <Text style={[s.meta, { color: theme.textSecondary }]}>Period: {invoice.period_key || invoice.month || 'N/A'}</Text>
                  </View>
                  <View style={[s.statusPill, { backgroundColor: isPaid ? theme.successLight : theme.warningLight }]}>
                    <Text style={[s.statusText, { color: isPaid ? theme.successText : theme.warningText }]}>
                      {isPaid ? 'PAID' : invoice.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {isPaid ? (
                  <View style={s.paidBadge}>
                    <Ionicons name="checkmark-circle" size={15} color={theme.successText} />
                    <Text style={[s.paidText, { color: theme.successText }]}>Payment confirmed</Text>
                  </View>
                ) : (
                  <View style={s.actionsRow}>
                    <TouchableOpacity
                      style={[s.primaryBtn, { backgroundColor: theme.primary }]}
                      onPress={() => router.push({ pathname: '/maintenance-payment', params: { invoiceId: invoice._id } })}
                    >
                      <Ionicons name="card-outline" size={15} color="#fff" />
                      <Text style={s.primaryBtnText}>Pay Online</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.offlineBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primaryMid }]}
                      onPress={() => openOfflineModal(invoice)}
                    >
                      <Ionicons name="camera-outline" size={15} color={theme.primary} />
                      <Text style={[s.offlineBtnText, { color: theme.primary }]}>Pay Offline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Offline Payment Modal */}
      <Modal visible={offlineModal} transparent animationType="slide" onRequestClose={() => setOfflineModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={s.overlay} onPress={() => setOfflineModal(false)}>
            <View style={[s.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <View style={s.sheetHandle} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                <View style={s.sheetHeader}>
                  <Text style={[s.sheetTitle, { color: theme.text }]}>Pay Offline</Text>
                  <TouchableOpacity onPress={() => setOfflineModal(false)} style={[s.closeBtn, { backgroundColor: theme.surfaceSubtle }]}>
                    <Ionicons name="close" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                {selectedInvoice && (
                  <View style={[s.invoiceSummary, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderLight }]}>
                    <Text style={[s.invoiceSummaryAmount, { color: theme.text }]}>PKR {selectedInvoice.amount}</Text>
                    <Text style={[s.invoiceSummaryPeriod, { color: theme.textSecondary }]}>{selectedInvoice.period_key || selectedInvoice.month}</Text>
                  </View>
                )}

                {bankAccount?.account_number ? (
                  <View style={[s.bankInfoBox, { backgroundColor: theme.infoLight, borderColor: '#bfdbfe' }]}>
                    <Text style={[s.bankInfoTitle, { color: theme.infoText }]}>Transfer to this account:</Text>
                    {[
                      { label: 'Bank', value: bankAccount.bank_name },
                      { label: 'Account Title', value: bankAccount.account_title },
                      { label: 'Account No.', value: bankAccount.account_number },
                      { label: 'IBAN', value: bankAccount.iban },
                    ].filter(f => f.value).map(f => (
                      <TouchableOpacity key={f.label} style={[s.bankRow, { borderBottomColor: theme.borderLight }]} onPress={() => copyToClipboard(f.value!, f.label)}>
                        <Text style={[s.bankLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                        <View style={s.bankValueRow}>
                          <Text style={[s.bankValue, { color: theme.text }]}>{f.value}</Text>
                          <Ionicons name="copy-outline" size={13} color={theme.primary} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={[s.noBankBox, { backgroundColor: theme.warningLight, borderColor: theme.warning }]}>
                    <Ionicons name="information-circle-outline" size={22} color={theme.warningText} />
                    <Text style={[s.noBankText, { color: theme.warningText }]}>Bank account not configured yet. Contact your society admin.</Text>
                  </View>
                )}

                <Text style={[s.inputLabel, { color: theme.textSecondary }]}>Attach Payment Screenshot *</Text>
                <TouchableOpacity style={[s.uploadBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primaryMid }]} onPress={pickScreenshot}>
                  <Ionicons name="cloud-upload-outline" size={22} color={theme.primary} />
                  <Text style={[s.uploadBtnText, { color: theme.primary }]}>{screenshotUrl ? 'Change Screenshot' : 'Upload Screenshot'}</Text>
                </TouchableOpacity>
                {screenshotUrl && (
                  <Image source={{ uri: screenshotUrl }} style={s.previewImage} />
                )}

                <Text style={[s.inputLabel, { color: theme.textSecondary }]}>Notes (optional)</Text>
                <TextInput
                  style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                  placeholder="e.g. Transfer ID, date, bank branch..."
                  placeholderTextColor={theme.textMuted}
                  value={offlineNotes}
                  onChangeText={setOfflineNotes}
                  multiline
                  returnKeyType="done"
                />

                <TouchableOpacity
                  style={[s.submitBtn, { backgroundColor: theme.primary }, (!screenshotUrl || submitting) && { opacity: 0.5 }]}
                  onPress={submitOffline}
                  disabled={submitting || !screenshotUrl}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.submitBtnText}>Submit for Approval</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 14 },
    backBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    bankCard: { borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1 },
    bankCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    bankCardTitle: { fontSize: 15, fontWeight: '800' },
    bankHint: { fontSize: 12, marginBottom: 12 },
    bankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
    bankLabel: { fontSize: 12, fontWeight: '700' },
    bankValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    bankValue: { fontSize: 13, fontWeight: '600' },

    card: { borderRadius: 22, padding: 18, marginBottom: 14, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    amount: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    meta: { fontSize: 13, fontWeight: '500' },
    statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    actionsRow: { flexDirection: 'row', gap: 10 },
    primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, borderRadius: 12 },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    offlineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, padding: 13, borderRadius: 12 },
    offlineBtnText: { fontWeight: '700', fontSize: 14 },
    paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    paidText: { fontWeight: '700', fontSize: 13 },

    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, maxHeight: '88%' },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 16 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    sheetTitle: { fontSize: 20, fontWeight: '800' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    invoiceSummary: { borderRadius: 14, padding: 14, marginBottom: 18, borderWidth: 1, alignItems: 'center' },
    invoiceSummaryAmount: { fontSize: 24, fontWeight: '800' },
    invoiceSummaryPeriod: { fontSize: 13, marginTop: 2 },
    bankInfoBox: { borderRadius: 14, padding: 14, marginBottom: 18, borderWidth: 1 },
    bankInfoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
    noBankBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 14, marginBottom: 18, borderWidth: 1 },
    noBankText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
    uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 14, marginBottom: 12 },
    uploadBtnText: { fontWeight: '700', fontSize: 14 },
    previewImage: { width: '100%', height: 160, borderRadius: 12, marginBottom: 16 },
    input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, marginBottom: 18, minHeight: 80, textAlignVertical: 'top' },
    submitBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 8 },
    submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  });
}

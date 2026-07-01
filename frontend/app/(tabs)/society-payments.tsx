import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiGetSocietyPaymentSummary, SocietyPaymentSummary } from '@/services/InvoiceService';
import { apiGetUserSocieties } from '@/services/SocietyService';
import { getAuthData } from '@/hooks/helperHooks';
import apiService from '@/services/ApiService';
import { EXPO_PUBLIC_API_BASE } from '@/constants';

type Tab = 'paid' | 'pending' | 'approvals';

interface OfflinePayment {
  _id: string;
  status: 'pending' | 'approved' | 'rejected';
  screenshot_url: string;
  notes?: string;
  created_at: string;
  invoice_id?: { amount: number; currency: string; period_key?: string; month?: string };
  user_id?: { name: string };
}

export default function SocietyPaymentsScreen() {
  const [summary, setSummary] = useState<SocietyPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [isAdmin, setIsAdmin] = useState(false);
  const [societyId, setSocietyId] = useState<string | null>(null);

  const [offlinePayments, setOfflinePayments] = useState<OfflinePayment[]>([]);
  const [loadingOffline, setLoadingOffline] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { userData, token } = await getAuthData();
      if (!userData) return;
      if (userData.role !== 'admin') {
        Alert.alert('Access Denied', 'You must be an admin to view this page.');
        return;
      }

      setIsAdmin(true);

      const societiesRes = await apiGetUserSocieties(userData.id);
      if (!societiesRes.success || !societiesRes.result?.length) {
        Alert.alert('Error', 'Could not find society information.');
        return;
      }

      const sid = societiesRes.result[0]._id;
      setSocietyId(sid);

      const [summaryRes] = await Promise.all([
        apiGetSocietyPaymentSummary(sid),
      ]);

      if (summaryRes.success && summaryRes.result) {
        setSummary(summaryRes.result);
      }
    } catch {
      Alert.alert('Error', 'Failed to load payment summary.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadOfflinePayments = useCallback(async () => {
    if (!societyId) return;
    setLoadingOffline(true);
    try {
      const { token } = await getAuthData();
      const res = await fetch(
        `${EXPO_PUBLIC_API_BASE}/api/payments/offline/society/${societyId}?status=pending`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) setOfflinePayments(data.result);
    } catch {
      console.warn('Failed to load offline payments');
    } finally {
      setLoadingOffline(false);
    }
  }, [societyId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (activeTab === 'approvals' && societyId) {
      loadOfflinePayments();
    }
  }, [activeTab, societyId, loadOfflinePayments]);

  const notifyResident = useCallback(async (invoice: any) => {
    const userId = invoice.user_id?._id || invoice.user_id;
    if (!userId) { Alert.alert('Error', 'Could not identify resident.'); return; }
    setNotifying(invoice._id);
    try {
      const res = await apiService.request<any>('post', '/api/notifications', {
        userIds: [userId],
        type: 'maintenance_reminder',
        title: 'Maintenance Payment Due',
        message: `Your maintenance payment of ${invoice.currency} ${invoice.amount} for ${invoice.period_key || invoice.month} is overdue. Please pay at your earliest convenience.`,
      });
      if (res.success) {
        Alert.alert('Notified', `Reminder sent to ${invoice.user_id?.name || 'resident'}.`);
      } else {
        Alert.alert('Error', res.message || 'Failed to send notification.');
      }
    } catch { Alert.alert('Error', 'Failed to send notification.'); }
    finally { setNotifying(null); }
  }, []);

  const reviewOffline = useCallback(async (id: string, status: 'approved' | 'rejected') => {
    setReviewing(id);
    try {
      const { token } = await getAuthData();
      const res = await fetch(`${EXPO_PUBLIC_API_BASE}/api/payments/offline/${id}/review`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Done', `Payment ${status}.`);
        setOfflinePayments(prev => prev.filter(p => p._id !== id));
      } else {
        Alert.alert('Error', data.message || 'Review failed.');
      }
    } catch { Alert.alert('Error', 'Could not submit review.'); }
    finally { setReviewing(null); }
  }, []);

  const confirmReview = (id: string, status: 'approved' | 'rejected') => {
    Alert.alert(
      status === 'approved' ? 'Approve Payment?' : 'Reject Payment?',
      status === 'approved'
        ? 'This will mark the invoice as paid and credit the society wallet.'
        : 'This will reject the offline payment submission.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: status === 'approved' ? 'Approve' : 'Reject', style: status === 'approved' ? 'default' : 'destructive', onPress: () => reviewOffline(id, status) },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const allInvoices = summary?.invoices ?? [];
  const paidInvoices = allInvoices.filter(i => i.status === 'paid');
  const unpaidInvoices = allInvoices.filter(i => i.status !== 'paid');

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'paid', label: 'Paid', count: paidInvoices.length },
    { key: 'pending', label: 'Pending', count: unpaidInvoices.length },
    { key: 'approvals', label: 'Approvals', count: offlinePayments.length },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryWrap}>
          <View style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
            <Text style={styles.summaryValue}>{summary.paidCount}</Text>
            <Text style={styles.summaryLabel}>Paid</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#fee2e2' }]}>
            <Text style={styles.summaryValue}>{summary.unpaidCount}</Text>
            <Text style={styles.summaryLabel}>Unpaid</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#e0f2fe' }]}>
            <Text style={styles.summaryValue}>{summary.totalCollected?.toLocaleString('en-PK')}</Text>
            <Text style={styles.summaryLabel}>Collected</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
            <Text style={styles.summaryValue}>{summary.totalDue?.toLocaleString('en-PK')}</Text>
            <Text style={styles.summaryLabel}>Outstanding</Text>
          </View>
        </View>
      )}

      {/* Tab Nav */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {tab.count !== undefined && tab.count > 0 && (
              <View style={[styles.badge, activeTab === tab.key && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === tab.key && styles.badgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
              if (activeTab === 'approvals') loadOfflinePayments();
            }}
          />
        }
      >
        {/* PAID TAB */}
        {activeTab === 'paid' && (
          paidInvoices.length === 0
            ? <View style={styles.emptyBox}><Text style={styles.emptyText}>No paid invoices yet.</Text></View>
            : paidInvoices.map(invoice => (
              <View key={invoice._id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.residentName}>{invoice.user_id?.name || 'Unknown'}</Text>
                  <Text style={styles.meta}>{invoice.apartment_id?.apartment_name || 'No apartment'}</Text>
                  <Text style={styles.meta}>PKR {invoice.amount?.toLocaleString('en-PK')} · {invoice.period_key || invoice.month}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.statusText, { color: '#15803d' }]}>Paid</Text>
                </View>
              </View>
            ))
        )}

        {/* PENDING TAB */}
        {activeTab === 'pending' && (
          unpaidInvoices.length === 0
            ? <View style={styles.emptyBox}><Text style={styles.emptyText}>All invoices are paid!</Text></View>
            : unpaidInvoices.map(invoice => {
              const isSending = notifying === invoice._id;
              return (
                <View key={invoice._id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.residentName}>{invoice.user_id?.name || 'Unknown'}</Text>
                    <Text style={styles.meta}>{invoice.apartment_id?.apartment_name || 'No apartment'}</Text>
                    <Text style={styles.meta}>PKR {invoice.amount?.toLocaleString('en-PK')} · {invoice.period_key || invoice.month}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <View style={[styles.statusPill, { backgroundColor: '#fee2e2' }]}>
                      <Text style={[styles.statusText, { color: '#b91c1c' }]}>Unpaid</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.notifyBtn, isSending && styles.notifyBtnDisabled]}
                      onPress={() => notifyResident(invoice)}
                      disabled={isSending}
                    >
                      {isSending
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name="notifications-outline" size={14} color="#fff" />}
                      <Text style={styles.notifyBtnText}>{isSending ? '...' : 'Notify'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
        )}

        {/* APPROVALS TAB */}
        {activeTab === 'approvals' && (
          loadingOffline
            ? <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
            : offlinePayments.length === 0
              ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="checkmark-circle-outline" size={36} color="#94a3b8" style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyText}>No pending approval requests.</Text>
                </View>
              )
              : offlinePayments.map(pmt => {
                const isReviewing = reviewing === pmt._id;
                const screenshotUrl = pmt.screenshot_url?.startsWith('http')
                  ? pmt.screenshot_url
                  : `${EXPO_PUBLIC_API_BASE}/${pmt.screenshot_url}`;

                return (
                  <View key={pmt._id} style={styles.approvalCard}>
                    <View style={styles.approvalHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.residentName}>{pmt.user_id?.name || 'Unknown Resident'}</Text>
                        <Text style={styles.meta}>
                          {pmt.invoice_id
                            ? `PKR ${pmt.invoice_id.amount?.toLocaleString('en-PK')} · ${pmt.invoice_id.period_key || pmt.invoice_id.month || ''}`
                            : 'Invoice details unavailable'}
                        </Text>
                        <Text style={styles.metaDate}>
                          Submitted {new Date(pmt.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: '#fef3c7' }]}>
                        <Text style={[styles.statusText, { color: '#b45309' }]}>Pending</Text>
                      </View>
                    </View>

                    {pmt.notes ? (
                      <Text style={styles.notesText}>Note: {pmt.notes}</Text>
                    ) : null}

                    {/* Screenshot preview */}
                    <TouchableOpacity onPress={() => setPreviewImage(screenshotUrl)}>
                      <Image
                        source={{ uri: screenshotUrl }}
                        style={styles.screenshotThumb}
                        resizeMode="cover"
                      />
                      <Text style={styles.tapToPreview}>Tap to preview receipt</Text>
                    </TouchableOpacity>

                    <View style={styles.reviewRow}>
                      <TouchableOpacity
                        style={[styles.reviewBtn, styles.approveBtn, isReviewing && styles.reviewBtnDisabled]}
                        onPress={() => confirmReview(pmt._id, 'approved')}
                        disabled={isReviewing}
                      >
                        {isReviewing
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={styles.reviewBtnText}>Approve</Text></>
                        }
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reviewBtn, styles.rejectBtn, isReviewing && styles.reviewBtnDisabled]}
                        onPress={() => confirmReview(pmt._id, 'rejected')}
                        disabled={isReviewing}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                        <Text style={styles.reviewBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
        )}
      </ScrollView>

      {/* Screenshot Preview Modal */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
          )}
          <Text style={styles.previewClose}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  summaryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, paddingBottom: 0 },
  summaryCard: { flexGrow: 1, minWidth: '22%', borderRadius: 14, padding: 12, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  summaryLabel: { fontSize: 11, color: '#334155', fontWeight: '700', marginTop: 2 },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14,
    borderRadius: 16, padding: 4, borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12, gap: 6,
  },
  tabBtnActive: { backgroundColor: '#2563eb' },
  tabLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  tabLabelActive: { color: '#fff' },
  badge: { backgroundColor: '#e2e8f0', borderRadius: 20, minWidth: 20, paddingHorizontal: 6, alignItems: 'center' },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  badgeTextActive: { color: '#fff' },

  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  approvalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  approvalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  residentName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  meta: { color: '#64748b', marginTop: 2, fontSize: 13 },
  metaDate: { color: '#94a3b8', marginTop: 2, fontSize: 12 },
  notesText: { fontSize: 13, color: '#475569', fontStyle: 'italic', marginBottom: 10, backgroundColor: '#f8fafc', padding: 8, borderRadius: 8 },
  screenshotThumb: { width: '100%', height: 160, borderRadius: 12, backgroundColor: '#f1f5f9', marginBottom: 4 },
  tapToPreview: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 12 },

  reviewRow: { flexDirection: 'row', gap: 10 },
  reviewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  reviewBtnDisabled: { opacity: 0.5 },
  approveBtn: { backgroundColor: '#16a34a' },
  rejectBtn: { backgroundColor: '#dc2626' },
  reviewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  cardActions: { flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700' },
  notifyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f59e0b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  notifyBtnDisabled: { backgroundColor: '#d1d5db' },
  notifyBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 15, fontWeight: '500' },

  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '90%', height: '75%' },
  previewClose: { color: '#94a3b8', marginTop: 16, fontSize: 13 },
});

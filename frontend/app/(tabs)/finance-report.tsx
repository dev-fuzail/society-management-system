import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { getAuthData } from "@/hooks/helperHooks";
import { apiGetUserSocieties } from "@/services/SocietyService";
import { apiGetWalletReport, apiAddManualEntry, WalletTransaction, WalletReport } from "@/services/FinanceService";

const fmt = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;

const typeColor = (type: string) => (type === "credit" ? "#16a34a" : "#dc2626");
const typeIcon = (type: string): any => (type === "credit" ? "arrow-down-circle" : "arrow-up-circle");
const refLabel = (ref: string) => {
  if (ref === "invoice") return "Maintenance";
  if (ref === "withdrawal") return "Withdrawal";
  return "Manual";
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseLocalDate(str: string): Date | null {
  // Accepts YYYY-MM-DD
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
}

export default function FinanceReportScreen() {
  const [report, setReport] = useState<WalletReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [entryType, setEntryType] = useState<"credit" | "debit">("debit");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Date filter
  const [filterVisible, setFilterVisible] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFrom, setAppliedFrom] = useState<Date | null>(null);
  const [appliedTo, setAppliedTo] = useState<Date | null>(null);

  const now = new Date();
  // Default view: current month
  const [viewMode, setViewMode] = useState<"month" | "custom">("month");

  const loadReport = useCallback(async (sid?: string) => {
    const id = sid || societyId;
    if (!id) return;
    try {
      const res = await apiGetWalletReport(id);
      if (res.success) setReport(res.result);
    } catch (e) {
      console.warn("[Finance] load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [societyId]);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        setLoading(true);
        const { userData } = await getAuthData();
        const res = await apiGetUserSocieties(userData.id);
        const soc = res.result?.[0];
        if (!soc) { setLoading(false); return; }
        setSocietyId(soc._id);
        setIsAdmin(userData.role === "admin");
        loadReport(soc._id);
      };
      init();
    }, [])
  );

  const onRefresh = () => { setRefreshing(true); loadReport(); };

  const applyFilter = () => {
    const from = parseLocalDate(fromDate);
    const to = parseLocalDate(toDate);
    if (fromDate && !from) { Alert.alert("Invalid", "Enter from date as YYYY-MM-DD"); return; }
    if (toDate && !to) { Alert.alert("Invalid", "Enter to date as YYYY-MM-DD"); return; }
    setAppliedFrom(from);
    setAppliedTo(to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59) : null);
    setViewMode("custom");
    setFilterVisible(false);
  };

  const clearFilter = () => {
    setFromDate("");
    setToDate("");
    setAppliedFrom(null);
    setAppliedTo(null);
    setViewMode("month");
    setFilterVisible(false);
  };

  const submitEntry = async () => {
    const amt = parseFloat(entryAmount);
    if (!entryTitle.trim()) return Alert.alert("Required", "Please enter a title / cause.");
    if (!amt || amt <= 0) return Alert.alert("Required", "Please enter a valid amount.");

    setSubmitting(true);
    try {
      const res = await apiAddManualEntry(societyId!, {
        type: entryType,
        amount: amt,
        title: entryTitle.trim(),
      });
      if (res.success) {
        setModalVisible(false);
        setEntryTitle("");
        setEntryAmount("");
        loadReport();
      } else {
        Alert.alert("Error", res.message);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add entry.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Ionicons name="wallet-outline" size={48} color="#cbd5e1" />
        <Text style={styles.emptyText}>No financial data yet.</Text>
      </View>
    );
  }

  const { wallet, transactions } = report;

  // Filtered transactions
  let filteredTx: WalletTransaction[];
  if (viewMode === "month" && !appliedFrom && !appliedTo) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredTx = transactions.filter(tx => new Date(tx.created_at) >= monthStart);
  } else {
    filteredTx = transactions.filter(tx => {
      const d = new Date(tx.created_at);
      if (appliedFrom && d < appliedFrom) return false;
      if (appliedTo && d > appliedTo) return false;
      return true;
    });
  }

  const totalCredits = filteredTx.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalDebits = filteredTx.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const creditCount = filteredTx.filter(t => t.type === "credit").length;
  const debitCount = filteredTx.filter(t => t.type === "debit").length;
  const utilization = totalCredits > 0 ? Math.min((totalDebits / totalCredits) * 100, 100) : 0;

  const filterLabel = viewMode === "month"
    ? `${MONTHS[now.getMonth()]} ${now.getFullYear()}`
    : (appliedFrom || appliedTo)
      ? `${appliedFrom ? appliedFrom.toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : "Start"} – ${appliedTo ? appliedTo.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "Now"}`
      : "All time";

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Society Balance</Text>
          <Text style={styles.balanceAmount}>{fmt(wallet.balance)}</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: "#16a34a" }]} />
              <View>
                <Text style={styles.summaryItemLabel}>Credits</Text>
                <Text style={[styles.summaryItemValue, { color: "#16a34a" }]}>+{fmt(totalCredits)}</Text>
                <Text style={styles.summaryCount}>{creditCount} entries</Text>
              </View>
            </View>
            <View style={styles.dividerV} />
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: "#dc2626" }]} />
              <View>
                <Text style={styles.summaryItemLabel}>Debits</Text>
                <Text style={[styles.summaryItemValue, { color: "#dc2626" }]}>-{fmt(totalDebits)}</Text>
                <Text style={styles.summaryCount}>{debitCount} entries</Text>
              </View>
            </View>
          </View>

          {/* Budget bar */}
          <View style={styles.barWrap}>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${utilization}%` }]} />
            </View>
            <View style={styles.barLabels}>
              <Text style={styles.barText}>Budget Utilization</Text>
              <Text style={styles.barPct}>{Math.round(utilization)}%</Text>
            </View>
          </View>
        </View>

        {/* Admin add-entry buttons */}
        {isAdmin && (
          <View style={styles.addRow}>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#16a34a" }]} onPress={() => { setEntryType("credit"); setModalVisible(true); }}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add Credit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#dc2626" }]} onPress={() => { setEntryType("debit"); setModalVisible(true); }}>
              <Ionicons name="remove-circle-outline" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Transaction header with filter */}
        <View style={styles.txHeaderRow}>
          <View>
            <Text style={styles.listHeader}>Transaction History</Text>
            <Text style={styles.filterChip}>{filterLabel}</Text>
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterVisible(true)}>
            <Ionicons name="filter-outline" size={16} color="#4f46e5" />
            <Text style={styles.filterBtnText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {filteredTx.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No transactions for this period.</Text>
          </View>
        ) : (
          filteredTx.map((tx) => (
            <View key={tx._id} style={styles.txCard}>
              <View style={[styles.txIcon, { backgroundColor: typeColor(tx.type) + "18" }]}>
                <Ionicons name={typeIcon(tx.type)} size={22} color={typeColor(tx.type)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txTitle}>{tx.title || refLabel(tx.reference_type)}</Text>
                <Text style={styles.txMeta}>
                  {refLabel(tx.reference_type)}
                  {tx.created_by?.name ? ` · ${tx.created_by.name}` : ""}
                  {" · "}{new Date(tx.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: typeColor(tx.type) }]}>
                {tx.type === "credit" ? "+" : "-"}{fmt(tx.amount)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Date Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setFilterVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Transactions</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Quick presets */}
            <Text style={styles.inputLabel}>Quick Select</Text>
            <View style={styles.presetRow}>
              {[
                { label: "This Month", action: () => { clearFilter(); } },
                { label: "Last Month", action: () => {
                  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                  setFromDate(`${lm.getFullYear()}-${String(lm.getMonth()+1).padStart(2,'0')}-01`);
                  setToDate(`${lmEnd.getFullYear()}-${String(lmEnd.getMonth()+1).padStart(2,'0')}-${String(lmEnd.getDate()).padStart(2,'0')}`);
                }},
                { label: "This Year", action: () => {
                  setFromDate(`${now.getFullYear()}-01-01`);
                  setToDate("");
                }},
              ].map(p => (
                <TouchableOpacity key={p.label} style={styles.presetBtn} onPress={p.action}>
                  <Text style={styles.presetBtnText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>From Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2025-01-01"
              placeholderTextColor="#94a3b8"
              value={fromDate}
              onChangeText={setFromDate}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>To Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2025-12-31"
              placeholderTextColor="#94a3b8"
              value={toDate}
              onChangeText={setToDate}
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={applyFilter}>
              <Text style={styles.submitText}>Apply Filter</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearBtn} onPress={clearFilter}>
              <Text style={styles.clearBtnText}>Reset to This Month</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Entry Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.modalSheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {entryType === "credit" ? "Add Income / Credit" : "Add Expense / Debit"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.toggleBtn, entryType === "credit" && styles.toggleCredit]}
                  onPress={() => setEntryType("credit")}
                >
                  <Text style={[styles.toggleText, entryType === "credit" && { color: "#fff" }]}>Credit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, entryType === "debit" && styles.toggleDebit]}
                  onPress={() => setEntryType("debit")}
                >
                  <Text style={[styles.toggleText, entryType === "debit" && { color: "#fff" }]}>Expense</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Title / Cause</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Water motor repair, Generator fuel..."
                placeholderTextColor="#94a3b8"
                value={entryTitle}
                onChangeText={setEntryTitle}
                maxLength={120}
                returnKeyType="next"
              />

              <Text style={styles.inputLabel}>Amount (PKR)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94a3b8"
                value={entryAmount}
                onChangeText={setEntryAmount}
                keyboardType="numeric"
                returnKeyType="done"
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: entryType === "credit" ? "#16a34a" : "#dc2626" }]}
                onPress={submitEntry}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitText}>
                      {entryType === "credit" ? "Record Credit" : "Record Expense"}
                    </Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { color: "#94a3b8", fontSize: 15, fontWeight: "500" },
  balanceCard: {
    backgroundColor: "#fff", borderRadius: 24, padding: 24, marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 14, elevation: 5,
    borderWidth: 1, borderColor: "#f1f5f9",
  },
  balanceLabel: { fontSize: 12, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
  balanceAmount: { fontSize: 34, fontWeight: "800", color: "#1e293b", marginTop: 4, marginBottom: 20 },
  summaryRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  summaryItem: { flex: 1, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  summaryDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  summaryItemLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" },
  summaryItemValue: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  summaryCount: { fontSize: 11, color: "#94a3b8", marginTop: 1 },
  dividerV: { width: 1, height: 40, backgroundColor: "#f1f5f9", marginHorizontal: 16 },
  barWrap: { gap: 8 },
  barBg: { height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#4f46e5", borderRadius: 3 },
  barLabels: { flexDirection: "row", justifyContent: "space-between" },
  barText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  barPct: { fontSize: 12, fontWeight: "800", color: "#1e293b" },
  addRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  addBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 14 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  txHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  listHeader: { fontSize: 17, fontWeight: "800", color: "#1e293b" },
  filterChip: { fontSize: 12, color: "#4f46e5", fontWeight: "600", marginTop: 2 },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#eef2ff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  filterBtnText: { color: "#4f46e5", fontWeight: "700", fontSize: 13 },

  emptyBox: { padding: 32, alignItems: "center", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#f1f5f9" },
  txCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: "#f1f5f9",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  txIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  txMeta: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "800" },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 32, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },

  presetRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  presetBtn: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  presetBtnText: { fontSize: 12, fontWeight: "700", color: "#475569" },

  typeToggle: { flexDirection: "row", gap: 10, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: "#f1f5f9" },
  toggleCredit: { backgroundColor: "#16a34a" },
  toggleDebit: { backgroundColor: "#dc2626" },
  toggleText: { fontWeight: "700", fontSize: 14, color: "#64748b" },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 6 },
  input: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, fontSize: 15, color: "#1e293b", marginBottom: 16 },
  submitBtn: { backgroundColor: "#4f46e5", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 4 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  clearBtn: { paddingVertical: 14, alignItems: "center", marginTop: 8 },
  clearBtnText: { color: "#64748b", fontWeight: "600", fontSize: 14 },
});

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Alert, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import {
  apiUpdateSociety,
  apiGetUserSocieties,
  apiUpdateMaintenanceSettings,
  apiGetMaintenanceAuditHistory,
} from "@/services/SocietyService";
import { getAuthData } from "@/hooks/helperHooks";
import { Ionicons } from "@expo/vector-icons";
import { MaintenanceConfigAudit } from "@/services/types";
import { EXPO_PUBLIC_API_BASE } from "@/constants";

const formatDateInput = (value?: string) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

export default function SocietyUpdateScreen() {
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    contact_email: "",
    total_apartments: "",
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    amount: "",
    currency: "PKR",
    due_day: "1",
    grace_period_days: "0",
    late_payment_charge: "0",
    effective_date: formatDateInput(),
  });
  const [societyId, setSocietyId] = useState("");
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceConfigAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: "", account_title: "", account_number: "", iban: "" });
  const [isSavingBank, setIsSavingBank] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      const { userData } = await getAuthData();
      if (!userData) {
        router.replace("/(tabs)");
        return;
      }

      if (userData.role !== 'admin') {
        Alert.alert("Access Denied", "You must be an admin to access this page.");
        router.back();
        return;
      }

      try {
        const res = await apiGetUserSocieties(userData.id);
        if (res.success && res.result.length > 0) {
          const currentSociety = res.result[0];
          setSocietyId(currentSociety._id);
          setForm({
            name: currentSociety.name || "",
            address: currentSociety.address || "",
            city: currentSociety.city || "",
            contact_email: currentSociety.contact_email || "",
            total_apartments: String(currentSociety.total_apartments || ""),
          });

          const config = currentSociety.maintenance_config;
          if (config) {
            setMaintenanceForm({
              amount: String(config.amount ?? ""),
              currency: config.currency || "PKR",
              due_day: String(config.due_day || 1),
              grace_period_days: String(config.grace_period_days || 0),
              late_payment_charge: String(config.late_payment_charge || 0),
              effective_date: formatDateInput(config.effective_date),
            });
          }


          const historyRes = await apiGetMaintenanceAuditHistory(currentSociety._id);
          if (historyRes.success) {
            setMaintenanceHistory(historyRes.result);
          }

          // Load bank account
          const { token } = await getAuthData();
          const bankRes = await fetch(`${EXPO_PUBLIC_API_BASE}/api/payments/bank-account/${currentSociety._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json());
          if (bankRes.success && bankRes.result?.bank_account) {
            const b = bankRes.result.bank_account;
            setBankForm({
              bank_name: b.bank_name || "",
              account_title: b.account_title || "",
              account_number: b.account_number || "",
              iban: b.iban || "",
            });
          }
        } else {
          Alert.alert("Error", "Could not find society information.");
        }
      } catch {
        Alert.alert("Error", "Failed to load society data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleMaintenanceChange = (key: string, value: string) => {
    setMaintenanceForm({ ...maintenanceForm, [key]: value });
  };

  const handleBankSubmit = async () => {
    if (!bankForm.account_number.trim()) {
      return Alert.alert("Required", "Please enter an account number.");
    }
    setIsSavingBank(true);
    try {
      const { token } = await getAuthData();
      const res = await fetch(`${EXPO_PUBLIC_API_BASE}/api/payments/bank-account/${societyId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(bankForm),
      }).then(r => r.json());
      if (res.success) {
        Alert.alert("Saved", "Bank account details updated successfully.");
      } else {
        Alert.alert("Error", res.message || "Failed to save bank account.");
      }
    } catch {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.address || !form.city) {
      return Alert.alert("Missing Fields", "Please fill in all required fields.");
    }

    try {
      setIsSubmitting(true);
      const { userData } = await getAuthData();

      if (!userData || !userData.id) {
        return Alert.alert("Error", "User not found. Please log in again.");
      }
      
      const payload = {
        userId: userData.id,
        name: form.name,
        address: form.address,
        city: form.city,
        contact_email: form.contact_email,
        total_apartments: Number(form.total_apartments),
      };

      const res = await apiUpdateSociety(payload);

      if (res.success && res.result) {
        const updatedSociety = res.result;
        setForm({
          name: updatedSociety.name,
          address: updatedSociety.address,
          city: updatedSociety.city,
          contact_email: updatedSociety.contact_email,
          total_apartments: String(updatedSociety.total_apartments),
        });
        Alert.alert("Success", "Society updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to update society.");
      }
    } catch {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaintenanceSubmit = async () => {
    const amount = Number(maintenanceForm.amount);
    const dueDay = Number(maintenanceForm.due_day);
    const gracePeriodDays = Number(maintenanceForm.grace_period_days);
    const latePaymentCharge = Number(maintenanceForm.late_payment_charge || 0);

    if (!societyId) {
      return Alert.alert("Error", "Society not found.");
    }

    if (!Number.isFinite(amount) || amount < 0) {
      return Alert.alert("Invalid Amount", "Enter a valid maintenance amount.");
    }

    if (!/^[A-Za-z]{3}$/.test(maintenanceForm.currency.trim())) {
      return Alert.alert("Invalid Currency", "Use a 3-letter currency code such as PKR or USD.");
    }

    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      return Alert.alert("Invalid Due Day", "Due day must be between 1 and 31.");
    }

    if (!Number.isInteger(gracePeriodDays) || gracePeriodDays < 0) {
      return Alert.alert("Invalid Grace Period", "Grace period must be a whole number.");
    }

    if (!Number.isFinite(latePaymentCharge) || latePaymentCharge < 0) {
      return Alert.alert("Invalid Late Charge", "Late payment charge must be valid.");
    }

    try {
      setIsSavingMaintenance(true);
      const { userData } = await getAuthData();

      if (!userData?.id) {
        return Alert.alert("Error", "User not found. Please log in again.");
      }

      const res = await apiUpdateMaintenanceSettings(societyId, {
        userId: userData.id,
        maintenance_config: {
          amount,
          currency: maintenanceForm.currency.trim().toUpperCase(),
          due_day: dueDay,
          grace_period_days: gracePeriodDays,
          late_payment_charge: latePaymentCharge,
          effective_date: maintenanceForm.effective_date,
        },
      });

      if (res.success && res.result) {
        const config = res.result.maintenance_config;
        setMaintenanceForm({
          amount: String(config.amount ?? ""),
          currency: config.currency || "PKR",
          due_day: String(config.due_day || 1),
          grace_period_days: String(config.grace_period_days || 0),
          late_payment_charge: String(config.late_payment_charge || 0),
          effective_date: formatDateInput(config.effective_date),
        });
        setMaintenanceHistory(prev => [res.result.audit, ...prev]);
        Alert.alert("Success", "Maintenance settings updated successfully.");
      } else {
        Alert.alert("Error", res.message || "Failed to update maintenance settings.");
      }
    } catch {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setIsSavingMaintenance(false);
    }
  };

  if (isLoading) {
    return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }]}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '500' }}>Loading Society Data...</Text>
        </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#f8fafc' }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
            <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Society Settings</Text>

        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <Text style={styles.label}>Society Name</Text>
            <TextInput
            style={styles.input}
            placeholder="e.g. Green Valley Residency"
            placeholderTextColor="#94a3b8"
            value={form.name}
            onChangeText={(t) => handleChange("name", t)}
            />

            <Text style={styles.label}>Full Address</Text>
            <TextInput
            style={styles.input}
            placeholder="Building, Road, Landmark"
            placeholderTextColor="#94a3b8"
            value={form.address}
            onChangeText={(t) => handleChange("address", t)}
            />

            <Text style={styles.label}>City</Text>
            <TextInput
            style={styles.input}
            placeholder="City"
            placeholderTextColor="#94a3b8"
            value={form.city}
            onChangeText={(t) => handleChange("city", t)}
            />
        </View>

        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Contact & Scale</Text>

            <Text style={styles.label}>Official Email</Text>
            <TextInput
            style={styles.input}
            placeholder="contact@society.com"
            keyboardType="email-address"
            placeholderTextColor="#94a3b8"
            value={form.contact_email}
            onChangeText={(t) => handleChange("contact_email", t)}
            />

            <Text style={styles.label}>Total Apartment Units</Text>
            <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor="#94a3b8"
            value={form.total_apartments}
            onChangeText={(t) => handleChange("total_apartments", t)}
            />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Society Details</Text>}
        </TouchableOpacity>

        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Maintenance Billing</Text>

            <Text style={styles.label}>Monthly Fee Amount</Text>
            <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor="#94a3b8"
            value={maintenanceForm.amount}
            onChangeText={(t) => handleMaintenanceChange("amount", t)}
            />

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Currency</Text>
                <TextInput
                style={styles.input}
                placeholder="PKR"
                autoCapitalize="characters"
                maxLength={3}
                placeholderTextColor="#94a3b8"
                value={maintenanceForm.currency}
                onChangeText={(t) => handleMaintenanceChange("currency", t.toUpperCase())}
                />
              </View>

              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Due Day</Text>
                <TextInput
                style={styles.input}
                placeholder="1"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
                value={maintenanceForm.due_day}
                onChangeText={(t) => handleMaintenanceChange("due_day", t)}
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Grace Days</Text>
                <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
                value={maintenanceForm.grace_period_days}
                onChangeText={(t) => handleMaintenanceChange("grace_period_days", t)}
                />
              </View>

              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Late Charge</Text>
                <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
                value={maintenanceForm.late_payment_charge}
                onChangeText={(t) => handleMaintenanceChange("late_payment_charge", t)}
                />
              </View>
            </View>

            <Text style={styles.label}>Effective Date</Text>
            <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
            value={maintenanceForm.effective_date}
            onChangeText={(t) => handleMaintenanceChange("effective_date", t)}
            />

            <TouchableOpacity style={styles.secondarySubmitBtn} onPress={handleMaintenanceSubmit} disabled={isSavingMaintenance}>
              {isSavingMaintenance ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Maintenance Settings</Text>}
            </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Maintenance Audit History</Text>
            {maintenanceHistory.length === 0 ? (
              <Text style={styles.emptyHistoryText}>No maintenance fee changes yet.</Text>
            ) : (
              maintenanceHistory.slice(0, 5).map((item) => (
                <View key={item._id} style={styles.historyRow}>
                  <View style={styles.historyIcon}>
                    <Ionicons name="receipt-outline" size={16} color="#0f766e" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>
                      {item.previous_amount} to {item.updated_amount} {item.updated_config?.currency || maintenanceForm.currency}
                    </Text>
                    <Text style={styles.historyMeta}>
                      {item.admin_id?.name || "Admin"} on {new Date(item.changed_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Bank Account for Offline Payments</Text>
          <Text style={styles.helperText}>
            Residents will see these details when choosing to pay offline. They can copy account info and submit a screenshot for approval.
          </Text>

          <Text style={styles.label}>Bank Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. HBL, Meezan Bank"
            placeholderTextColor="#94a3b8"
            value={bankForm.bank_name}
            onChangeText={(t) => setBankForm({ ...bankForm, bank_name: t })}
          />

          <Text style={styles.label}>Account Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Green Valley Society"
            placeholderTextColor="#94a3b8"
            value={bankForm.account_title}
            onChangeText={(t) => setBankForm({ ...bankForm, account_title: t })}
          />

          <Text style={styles.label}>Account Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 01234567890123"
            keyboardType="numeric"
            placeholderTextColor="#94a3b8"
            value={bankForm.account_number}
            onChangeText={(t) => setBankForm({ ...bankForm, account_number: t })}
          />

          <Text style={styles.label}>IBAN (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. PK36SCBL0000001123456702"
            autoCapitalize="characters"
            placeholderTextColor="#94a3b8"
            value={bankForm.iban}
            onChangeText={(t) => setBankForm({ ...bankForm, iban: t.toUpperCase() })}
          />

          <TouchableOpacity style={styles.secondarySubmitBtn} onPress={handleBankSubmit} disabled={isSavingBank}>
            {isSavingBank ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Bank Account</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Resident Payments</Text>
          <Text style={styles.helperText}>
            Review which residents have paid this month's maintenance and who still owes.
          </Text>
          <TouchableOpacity style={styles.secondarySubmitBtn} onPress={() => router.push('/society-payments' as any)}>
            <Text style={styles.submitBtnText}>View Payment Status</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 6 },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: '#1e293b',
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
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
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  submitBtn: {
    backgroundColor: '#4f46e5',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 10,
  },
  secondarySubmitBtn: {
    backgroundColor: '#0f766e',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#0f766e',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 4,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  emptyHistoryText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 18,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    color: '#1e293b',
    fontWeight: '800',
    fontSize: 14,
  },
  historyMeta: {
    color: '#64748b',
    fontWeight: '500',
    fontSize: 12,
    marginTop: 2,
  },
});

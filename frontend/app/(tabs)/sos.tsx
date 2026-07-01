import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getAuthData } from '@/hooks/helperHooks';
import { apiGetUserSocieties } from '@/services/SocietyService';
import { EXPO_PUBLIC_API_BASE } from '@/constants';

type Category = 'police' | 'ambulance' | 'fire' | 'rescue' | 'other';

interface EmergencyContact {
  _id: string;
  name: string;
  number: string;
  category: Category;
  is_default: boolean;
}

const CATEGORY_META: Record<Category, { label: string; icon: any; color: string; bg: string }> = {
  police:    { label: 'Police',    icon: 'shield-outline',       color: '#1d4ed8', bg: '#eff6ff' },
  ambulance: { label: 'Ambulance', icon: 'medkit-outline',       color: '#dc2626', bg: '#fef2f2' },
  fire:      { label: 'Fire',      icon: 'flame-outline',        color: '#ea580c', bg: '#fff7ed' },
  rescue:    { label: 'Rescue',    icon: 'boat-outline',         color: '#0891b2', bg: '#ecfeff' },
  other:     { label: 'Other',     icon: 'call-outline',         color: '#7c3aed', bg: '#f5f3ff' },
};

const CATEGORIES: Category[] = ['police', 'ambulance', 'fire', 'rescue', 'other'];

export default function SOSScreen() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Add/Edit modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formCategory, setFormCategory] = useState<Category>('other');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadContacts = useCallback(async (sid?: string) => {
    const id = sid || societyId;
    if (!id || !token) return;
    try {
      const res = await fetch(`${EXPO_PUBLIC_API_BASE}/api/emergency/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setContacts(data.result);
    } catch (e) {
      console.warn('Failed to load emergency contacts', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [societyId, token]);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        setLoading(true);
        const { userData, token: t } = await getAuthData();
        setToken(t);
        const res = await apiGetUserSocieties(userData.id);
        const soc = res.result?.[0];
        if (!soc) { setLoading(false); return; }
        setSocietyId(soc._id);
        setIsAdmin(userData.role === 'admin');

        // load with freshly fetched values
        try {
          const cr = await fetch(`${EXPO_PUBLIC_API_BASE}/api/emergency/${soc._id}`, {
            headers: { Authorization: `Bearer ${t}` },
          });
          const data = await cr.json();
          if (data.success) setContacts(data.result);
        } catch {}
        setLoading(false);
      };
      init();
    }, [])
  );

  const callNumber = (number: string) => {
    const url = `tel:${number}`;
    Linking.canOpenURL(url).then(can => {
      if (can) Linking.openURL(url);
      else Alert.alert('Cannot Call', 'Calling is not available on this device.');
    });
  };

  const openAdd = () => {
    setEditing(null);
    setFormName('');
    setFormNumber('');
    setFormCategory('other');
    setModalVisible(true);
  };

  const openEdit = (contact: EmergencyContact) => {
    setEditing(contact);
    setFormName(contact.name);
    setFormNumber(contact.number);
    setFormCategory(contact.category);
    setModalVisible(true);
  };

  const saveContact = async () => {
    if (!formName.trim()) { Alert.alert('Required', 'Enter a name.'); return; }
    if (!formNumber.trim()) { Alert.alert('Required', 'Enter a phone number.'); return; }
    setSaving(true);
    try {
      let res;
      if (editing) {
        res = await fetch(`${EXPO_PUBLIC_API_BASE}/api/emergency/${editing._id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim(), number: formNumber.trim(), category: formCategory }),
        });
      } else {
        res = await fetch(`${EXPO_PUBLIC_API_BASE}/api/emergency/${societyId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim(), number: formNumber.trim(), category: formCategory }),
        });
      }
      const data = await res.json();
      if (data.success) {
        setModalVisible(false);
        loadContacts();
      } else {
        Alert.alert('Error', data.message || 'Failed to save.');
      }
    } catch { Alert.alert('Error', 'Could not save contact.'); }
    finally { setSaving(false); }
  };

  const deleteContact = (contact: EmergencyContact) => {
    Alert.alert(
      'Delete Contact',
      `Remove "${contact.name}" from emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            setDeleting(contact._id);
            try {
              const res = await fetch(`${EXPO_PUBLIC_API_BASE}/api/emergency/${contact._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (data.success) setContacts(prev => prev.filter(c => c._id !== contact._id));
              else Alert.alert('Error', data.message);
            } catch { Alert.alert('Error', 'Could not delete contact.'); }
            finally { setDeleting(null); }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = contacts.filter(c => c.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<Category, EmergencyContact[]>);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="warning" size={28} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Emergency SOS</Text>
          <Text style={styles.bannerSub}>Tap any contact to call directly from your phone.</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadContacts(); }} />}
      >
        {Object.entries(grouped).map(([cat, items]) => {
          const meta = CATEGORY_META[cat as Category];
          return (
            <View key={cat} style={styles.section}>
              <View style={styles.catHeader}>
                <View style={[styles.catIconBox, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={16} color={meta.color} />
                </View>
                <Text style={[styles.catTitle, { color: meta.color }]}>{meta.label}</Text>
              </View>

              {items.map(contact => (
                <View key={contact._id} style={styles.contactCard}>
                  <View style={[styles.callIconBox, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactNumber}>{contact.number}</Text>
                  </View>
                  <View style={styles.contactActions}>
                    <TouchableOpacity style={styles.callBtn} onPress={() => callNumber(contact.number)}>
                      <Ionicons name="call" size={16} color="#fff" />
                      <Text style={styles.callBtnText}>Call</Text>
                    </TouchableOpacity>
                    {isAdmin && (
                      <View style={styles.adminBtns}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(contact)}>
                          <Ionicons name="pencil-outline" size={15} color="#475569" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.editBtn, deleting === contact._id && { opacity: 0.4 }]}
                          onPress={() => deleteContact(contact)}
                          disabled={deleting === contact._id}
                        >
                          {deleting === contact._id
                            ? <ActivityIndicator size="small" color="#dc2626" />
                            : <Ionicons name="trash-outline" size={15} color="#dc2626" />
                          }
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {contacts.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="call-outline" size={40} color="#cbd5e1" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No emergency contacts yet.</Text>
          </View>
        )}
      </ScrollView>

      {/* Admin: Add button */}
      {isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={openAdd}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Contact' : 'Add Emergency Contact'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Edhi Ambulance"
              placeholderTextColor="#94a3b8"
              value={formName}
              onChangeText={setFormName}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 115"
              placeholderTextColor="#94a3b8"
              value={formNumber}
              onChangeText={setFormNumber}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => {
                const m = CATEGORY_META[cat];
                const selected = formCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, selected && { backgroundColor: m.color, borderColor: m.color }]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Ionicons name={m.icon} size={14} color={selected ? '#fff' : m.color} />
                    <Text style={[styles.catChipText, selected && { color: '#fff' }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveContact}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Add Contact'}</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  banner: {
    backgroundColor: '#dc2626', flexDirection: 'row', alignItems: 'center',
    gap: 14, padding: 18, paddingTop: 20,
  },
  bannerIcon: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  scroll: { padding: 16, paddingBottom: 100 },

  section: { marginBottom: 8 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 12 },
  catIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  contactCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  callIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  contactNumber: { fontSize: 13, color: '#64748b', marginTop: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  contactActions: { alignItems: 'flex-end', gap: 6 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#dc2626', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  adminBtns: { flexDirection: 'row', gap: 6 },
  editBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },

  emptyBox: { padding: 48, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 15, fontWeight: '500' },

  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#dc2626', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 14, fontSize: 15, color: '#0f172a', marginBottom: 16,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  catChipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  saveBtn: { backgroundColor: '#dc2626', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

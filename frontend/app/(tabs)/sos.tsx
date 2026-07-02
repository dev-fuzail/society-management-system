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
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

type Category = 'police' | 'ambulance' | 'fire' | 'rescue' | 'other';

interface EmergencyContact {
  _id: string;
  name: string;
  number: string;
  category: Category;
  is_default: boolean;
}

const CATEGORY_META: Record<Category, { label: string; icon: any; color: string; bg: string }> = {
  police:    { label: 'Police',    icon: 'shield-outline',  color: '#1d4ed8', bg: '#eff6ff' },
  ambulance: { label: 'Ambulance', icon: 'medkit-outline',  color: '#dc2626', bg: '#fef2f2' },
  fire:      { label: 'Fire',      icon: 'flame-outline',   color: '#ea580c', bg: '#fff7ed' },
  rescue:    { label: 'Rescue',    icon: 'boat-outline',    color: '#0891b2', bg: '#ecfeff' },
  other:     { label: 'Other',     icon: 'call-outline',    color: '#7c3aed', bg: '#f5f3ff' },
};

const CATEGORIES: Category[] = ['police', 'ambulance', 'fire', 'rescue', 'other'];

export default function SOSScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

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
      <View style={[s.centered, { backgroundColor: theme.bg }]}>
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
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Red SOS Banner — always red, semantic */}
      <View style={s.banner}>
        <View style={s.bannerIcon}>
          <Ionicons name="warning" size={28} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.bannerTitle}>Emergency SOS</Text>
          <Text style={s.bannerSub}>Tap any contact to call directly from your phone.</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadContacts(); }} tintColor="#dc2626" />}
      >
        {Object.entries(grouped).map(([cat, items]) => {
          const meta = CATEGORY_META[cat as Category];
          return (
            <View key={cat} style={s.section}>
              <View style={s.catHeader}>
                <View style={[s.catIconBox, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={16} color={meta.color} />
                </View>
                <Text style={[s.catTitle, { color: meta.color }]}>{meta.label}</Text>
              </View>

              {items.map(contact => (
                <View key={contact._id} style={[s.contactCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                  <View style={[s.callIconBox, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.contactName, { color: theme.text }]}>{contact.name}</Text>
                    <Text style={[s.contactNumber, { color: theme.textSecondary }]}>{contact.number}</Text>
                  </View>
                  <View style={s.contactActions}>
                    <TouchableOpacity style={s.callBtn} onPress={() => callNumber(contact.number)}>
                      <Ionicons name="call" size={16} color="#fff" />
                      <Text style={s.callBtnText}>Call</Text>
                    </TouchableOpacity>
                    {isAdmin && (
                      <View style={s.adminBtns}>
                        <TouchableOpacity style={[s.editBtn, { backgroundColor: theme.surfaceSubtle }]} onPress={() => openEdit(contact)}>
                          <Ionicons name="pencil-outline" size={15} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.editBtn, { backgroundColor: theme.dangerLight }, deleting === contact._id && { opacity: 0.4 }]}
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
          <View style={s.emptyBox}>
            <View style={[s.emptyIcon, { backgroundColor: theme.surfaceSubtle }]}>
              <Ionicons name="call-outline" size={40} color={theme.textMuted} />
            </View>
            <Text style={[s.emptyText, { color: theme.textMuted }]}>No emergency contacts yet.</Text>
            {isAdmin && <Text style={[s.emptyHint, { color: theme.textMuted }]}>Tap + to add contacts.</Text>}
          </View>
        )}
      </ScrollView>

      {isAdmin && (
        <TouchableOpacity style={s.fab} onPress={openAdd}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
            <View style={[s.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <View style={s.sheetHandle} />
              <View style={s.sheetHeader}>
                <Text style={[s.sheetTitle, { color: theme.text }]}>{editing ? 'Edit Contact' : 'Add Emergency Contact'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={[s.closeBtn, { backgroundColor: theme.surfaceSubtle }]}>
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[s.inputLabel, { color: theme.textSecondary }]}>Name</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                placeholder="e.g. Edhi Ambulance"
                placeholderTextColor={theme.textMuted}
                value={formName}
                onChangeText={setFormName}
              />

              <Text style={[s.inputLabel, { color: theme.textSecondary }]}>Phone Number</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                placeholder="e.g. 115"
                placeholderTextColor={theme.textMuted}
                value={formNumber}
                onChangeText={setFormNumber}
                keyboardType="phone-pad"
              />

              <Text style={[s.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              <View style={s.categoryGrid}>
                {CATEGORIES.map(cat => {
                  const m = CATEGORY_META[cat];
                  const selected = formCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[s.catChip, { borderColor: selected ? m.color : theme.border, backgroundColor: selected ? m.color : theme.surfaceSubtle }]}
                      onPress={() => setFormCategory(cat)}
                    >
                      <Ionicons name={m.icon} size={14} color={selected ? '#fff' : m.color} />
                      <Text style={[s.catChipText, { color: selected ? '#fff' : theme.textSecondary }]}>{m.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={saveContact}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.saveBtnText}>{editing ? 'Save Changes' : 'Add Contact'}</Text>
                }
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
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
      borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
      marginBottom: 8, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    callIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    contactName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    contactNumber: { fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    contactActions: { alignItems: 'flex-end', gap: 6 },
    callBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: '#dc2626', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    },
    callBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    adminBtns: { flexDirection: 'row', gap: 6 },
    editBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    emptyBox: { padding: 48, alignItems: 'center', gap: 12 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 16, fontWeight: '600' },
    emptyHint: { fontSize: 13 },
    fab: {
      position: 'absolute', right: 20, bottom: 24,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center',
      shadowColor: '#dc2626', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 16 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 18, fontWeight: '800' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
    input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, marginBottom: 16 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    catChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
    },
    catChipText: { fontSize: 13, fontWeight: '700' },
    saveBtn: { backgroundColor: '#dc2626', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  });
}

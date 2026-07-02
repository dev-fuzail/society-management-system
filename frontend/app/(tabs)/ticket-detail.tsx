import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert,
  TouchableOpacity, Modal, Pressable, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGetTicketById, apiUpdateTicketStatus } from '@/services/TicketService';
import { TicketResponse, TicketStatus, UpdateStatusData, UserData } from '@/services/types';
import { getAuthData } from '@/hooks/helperHooks';
import { apiGetSocietyUsers } from '@/services/SocietyService';
import { EXPO_PUBLIC_API_BASE } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

const getStatusMeta = (status: TicketStatus) => ({
  Pending:     { color: '#d97706', bg: '#fef3c7' },
  'In Progress': { color: '#2563eb', bg: '#dbeafe' },
  Resolved:    { color: '#059669', bg: '#dcfce7' },
  Closed:      { color: '#64748b', bg: '#f1f5f9' },
}[status] ?? { color: '#64748b', bg: '#f1f5f9' });

const STATUS_OPTIONS: TicketStatus[] = ['Pending', 'In Progress', 'Resolved', 'Closed'];

export default function TicketDetailScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const router = useRouter();
  const params = useLocalSearchParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState<TicketStatus>('Pending');
  const [isUpdating, setIsUpdating] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<UserData[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string | undefined>(undefined);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isImageVisible, setIsImageVisible] = useState(true);

  const isUserStaff = user?.role === 'admin' || user?.role === 'staff';

  const fetchSocietyMembers = useCallback(async (societyId: string) => {
    setLoadingMembers(true);
    try {
      const response = await apiGetSocietyUsers(societyId);
      if (response.success && response.result) {
        const allUsers = [...response.result.admins, ...response.result.members];
        const uniqueUsers = Array.from(new Map(allUsers.map(item => [item._id || item.id, item])).values());
        setAssignableUsers(uniqueUsers);
      }
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initAndFetch = async () => {
      if (!ticketId) { router.back(); return; }
      setLoading(true);
      try {
        const { userData } = await getAuthData();
        if (!isMounted) return;
        setUser(userData);
        const response = await apiGetTicketById(ticketId);
        if (!isMounted) return;
        if (response.success && response.result) {
          setTicket(response.result);
          setNewStatus(response.result.status);
          if (response.result.assignedTo) setSelectedAssignee(response.result.assignedTo._id);
          if (userData?.role === 'admin' || userData?.role === 'staff') {
            await fetchSocietyMembers(response.result.societyId);
          }
        } else {
          Alert.alert("Error", "Ticket not found.");
          router.back();
        }
      } catch {
        if (isMounted) { Alert.alert("Error", "Failed to load ticket details."); router.back(); }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    initAndFetch();
    return () => { isMounted = false; };
  }, [ticketId, router, fetchSocietyMembers]);

  useEffect(() => { setIsImageVisible(true); }, [ticket?._id, ticket?.imageUrl]);

  const handleStatusUpdate = async () => {
    setIsUpdating(true);
    try {
      const updatePayload: UpdateStatusData = { status: newStatus };
      if (selectedAssignee) updatePayload.assignedTo = selectedAssignee;
      const response = await apiUpdateTicketStatus(ticketId, updatePayload);
      if (response.success && response.result) {
        setTicket(response.result);
        Alert.alert("Success", "Ticket updated!");
        setIsStatusModalVisible(false);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.container, s.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!ticket) return null;

  const statusMeta = getStatusMeta(ticket.status);
  const rawImage = ticket.imageUrl || (ticket as any).image || (ticket as any).attachment || (ticket as any).image_url || null;
  const imageUri = rawImage
    ? (rawImage.startsWith('http') ? rawImage : `${EXPO_PUBLIC_API_BASE}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`)
    : null;

  return (
    <ScrollView style={[s.container, { backgroundColor: theme.bg }]} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Ionicons name="arrow-back" size={20} color={theme.text} />
        <Text style={[s.backBtnText, { color: theme.text }]}>Back to List</Text>
      </TouchableOpacity>

      {/* Header Card */}
      <View style={[s.headerCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
        <View style={s.headerTop}>
          <Text style={[s.ticketIdText, { color: theme.textMuted }]}>TICKET #{ticket._id.slice(-6).toUpperCase()}</Text>
          <View style={[s.statusPill, { backgroundColor: statusMeta.bg }]}>
            <Text style={[s.statusPillText, { color: statusMeta.color }]}>{ticket.status}</Text>
          </View>
        </View>
        <Text style={[s.subjectTitle, { color: theme.text }]}>{ticket.subject}</Text>
      </View>

      {/* Description */}
      <View style={[s.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
        <Text style={[s.sectionTitle, { color: theme.text }]}>Issue Description</Text>
        <Text style={[s.descriptionText, { color: theme.textSecondary }]}>{ticket.description}</Text>
        {imageUri && isImageVisible ? (
          <View style={s.attachmentWrap}>
            <Text style={[s.attachmentLabel, { color: theme.textMuted }]}>Attachment</Text>
            <Image source={{ uri: imageUri }} style={[s.attachmentImage, { borderColor: theme.borderLight }]} onError={() => setIsImageVisible(false)} />
          </View>
        ) : null}
      </View>

      {/* Details */}
      <View style={[s.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
        <Text style={[s.sectionTitle, { color: theme.text }]}>Additional Details</Text>
        <View style={[s.detailItem, { borderBottomColor: theme.borderLight }]}>
          <View style={[s.detailIcon, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="person-outline" size={18} color={theme.primary} />
          </View>
          <View>
            <Text style={[s.detailLabel, { color: theme.textMuted }]}>Created By</Text>
            <Text style={[s.detailValue, { color: theme.text }]}>{ticket.createdBy?.name || 'N/A'}</Text>
          </View>
        </View>
        <View style={[s.detailItem, { borderBottomWidth: 0 }]}>
          <View style={[s.detailIcon, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="briefcase-outline" size={18} color={theme.primary} />
          </View>
          <View>
            <Text style={[s.detailLabel, { color: theme.textMuted }]}>Assigned Staff</Text>
            <Text style={[s.detailValue, { color: theme.text }]}>{ticket.assignedTo?.name || 'Unassigned'}</Text>
          </View>
        </View>
      </View>

      {isUserStaff && (
        <TouchableOpacity
          style={[s.actionButton, { backgroundColor: theme.primary }]}
          onPress={() => setIsStatusModalVisible(true)}
          disabled={isUpdating}
        >
          <Ionicons name="options-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.actionButtonText}>Update Ticket</Text>
        </TouchableOpacity>
      )}

      <Modal visible={isStatusModalVisible} transparent animationType="slide" onRequestClose={() => setIsStatusModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <Pressable style={s.modalBackdrop} onPress={() => setIsStatusModalVisible(false)} />
            <View style={[s.modalContainer, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <View style={s.sheetHandle} />
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: theme.text }]}>Update Ticket</Text>
                <TouchableOpacity onPress={() => setIsStatusModalVisible(false)} style={[s.closeBtn, { backgroundColor: theme.surfaceSubtle }]}>
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[s.inputLabel, { color: theme.textSecondary }]}>Set New Status</Text>
                <View style={s.statusPickerContainer}>
                  {STATUS_OPTIONS.map((status) => {
                    const meta = getStatusMeta(status);
                    const isSelected = status === newStatus;
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[s.statusOption, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderLight }, isSelected && { backgroundColor: meta.bg, borderColor: meta.color }]}
                        onPress={() => setNewStatus(status)}
                      >
                        <Text style={[s.statusOptionText, { color: isSelected ? meta.color : theme.textSecondary }]}>{status}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[s.inputLabel, { color: theme.textSecondary }]}>Reassign Staff (Optional)</Text>
                {loadingMembers ? (
                  <ActivityIndicator size="small" color={theme.primary} style={{ margin: 20 }} />
                ) : (
                  <View style={s.userListContainer}>
                    <TouchableOpacity
                      style={[s.userOption, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderLight }, !selectedAssignee && { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                      onPress={() => setSelectedAssignee(undefined)}
                    >
                      <View style={[s.avatarPlaceholder, { backgroundColor: theme.surfaceSubtle }]}>
                        <Ionicons name="person-remove-outline" size={16} color={theme.textSecondary} />
                      </View>
                      <Text style={[s.userOptionText, { color: !selectedAssignee ? theme.primary : theme.text, fontWeight: !selectedAssignee ? '700' : '600' }]}>Unassigned</Text>
                    </TouchableOpacity>

                    {assignableUsers.map((u) => {
                      const uId = u._id || u.id?.toString();
                      const isSelected = selectedAssignee === uId;
                      return (
                        <TouchableOpacity
                          key={uId}
                          style={[s.userOption, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderLight }, isSelected && { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                          onPress={() => setSelectedAssignee(uId)}
                        >
                          <View style={[s.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                            <Text style={s.avatarText}>{u.name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.userOptionText, { color: isSelected ? theme.primary : theme.text, fontWeight: isSelected ? '700' : '600' }]}>{u.name}</Text>
                            <Text style={[s.userRoleText, { color: theme.textMuted }]}>{u.role}</Text>
                          </View>
                          {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <TouchableOpacity
                  style={[s.submitButton, { backgroundColor: theme.primary }]}
                  onPress={handleStatusUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={s.submitButtonText}>Save Changes</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, padding: 20 },
    center: { justifyContent: 'center', alignItems: 'center' },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 6 },
    backBtnText: { fontSize: 15, fontWeight: '600' },
    headerCard: {
      padding: 24, borderRadius: 24, marginBottom: 20,
      shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    ticketIdText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
    subjectTitle: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
    statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusPillText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    sectionCard: {
      padding: 24, borderRadius: 24, marginBottom: 20,
      shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1,
    },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
    descriptionText: { fontSize: 15, lineHeight: 24 },
    attachmentWrap: { marginTop: 14 },
    attachmentLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
    attachmentImage: { width: '100%', height: 180, borderRadius: 14, borderWidth: 1 },
    detailItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, gap: 14 },
    detailIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    detailLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
    detailValue: { fontSize: 15, fontWeight: '700' },
    actionButton: {
      padding: 18, borderRadius: 18, alignItems: 'center',
      marginBottom: 40, flexDirection: 'row', justifyContent: 'center',
    },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
    modalContainer: {
      borderTopLeftRadius: 32, borderTopRightRadius: 32,
      padding: 24, maxHeight: '90%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
    },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    inputLabel: { fontSize: 14, fontWeight: '700', marginBottom: 12, marginTop: 8 },
    statusPickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    statusOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
    statusOptionText: { fontSize: 14, fontWeight: '700' },
    userListContainer: { marginBottom: 24, gap: 8 },
    userOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, gap: 12 },
    userOptionText: { fontSize: 15 },
    userRoleText: { fontSize: 12, fontWeight: '500' },
    avatarPlaceholder: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    submitButton: { padding: 18, borderRadius: 16, alignItems: 'center' },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}

import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import ElectionService, { ElectionDetails } from '@/services/ElectionService';
import { getAuthData } from '@/hooks/helperHooks';
import { apiGetSocietyUsers } from '@/services/SocietyService';
import { UserData } from '@/services/types';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

export default function ElectionDetailScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [details, setDetails] = useState<ElectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [userRole, setUserRole] = useState('resident');
  const [societyUsers, setSocietyUsers] = useState<UserData[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [manifesto, setManifesto] = useState('');
  const [assigning, setAssigning] = useState(false);
  const router = useRouter();

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      const { userData } = await getAuthData();
      if (userData?.role) setUserRole(userData.role);

      const res = await ElectionService.getElectionDetails(id);
      if (res.success) {
        setDetails(res.result);
        if (userData?.role === 'admin') {
          const usersRes = await apiGetSocietyUsers(res.result.election.society_id);
          if (usersRes.success) {
            const combined = [...usersRes.result.members, ...usersRes.result.admins];
            const deduped = Array.from(new Map(combined.map((u) => [u._id, u])).values());
            setSocietyUsers(deduped);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching election details:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleAssignCandidate = async () => {
    if (!id) return;
    if (!selectedUserId || !manifesto.trim()) {
      Alert.alert('Validation', 'Please select a user and enter manifesto.');
      return;
    }
    try {
      setAssigning(true);
      const res = await ElectionService.addCandidate({
        election_id: id,
        user_id: selectedUserId,
        manifesto: manifesto.trim(),
      });
      if (res.success) {
        Alert.alert('Success', 'Candidate assigned successfully.');
        setAssignModalVisible(false);
        setSelectedUserId('');
        setManifesto('');
        fetchDetails();
      } else {
        Alert.alert('Error', res.message || 'Failed to assign candidate.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to assign candidate.');
    } finally {
      setAssigning(false);
    }
  };

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const handleVote = async (candidateId: string) => {
    if (!id) return;
    Alert.alert(
      "Confirm Vote",
      "Are you sure you want to cast your vote for this candidate? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Vote",
          onPress: async () => {
            setVoting(true);
            try {
              const res = await ElectionService.castVote(id, candidateId);
              if (res.success) {
                Alert.alert("Success", "Your vote has been cast successfully!");
              } else {
                Alert.alert("Error", res.message || "Failed to cast vote.");
              }
            } catch (error: any) {
              Alert.alert("Error", error.message || "An error occurred.");
            } finally {
              setVoting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) return (
    <View style={[s.container, s.center, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );

  if (!details) return (
    <View style={[s.container, s.center, { backgroundColor: theme.bg }]}>
      <Text style={{ color: theme.textSecondary }}>Election not found.</Text>
    </View>
  );

  const { election, candidates } = details;
  const existingCandidateIds = new Set(candidates.map((c) => c.user_id?._id));
  const assignableUsers = societyUsers.filter((u) => !existingCandidateIds.has(u._id));
  const isOngoing = election.status === 'ongoing';

  return (
    <ScrollView style={[s.container, { backgroundColor: theme.bg }]} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Ionicons name="arrow-back" size={20} color={theme.text} />
        <Text style={[s.backBtnText, { color: theme.text }]}>Back to Elections</Text>
      </TouchableOpacity>

      <View style={[s.infoCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
        <View style={s.infoTop}>
          <Text style={[s.electionTitle, { color: theme.text }]}>{election.title}</Text>
          <View style={[s.badge, { backgroundColor: isOngoing ? theme.successLight : theme.surfaceSubtle }]}>
            <Text style={[s.badgeText, { color: isOngoing ? theme.successText : theme.textSecondary }]}>
              {election.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={s.dateRow}>
          <Ionicons name="time-outline" size={16} color={theme.textMuted} />
          <Text style={[s.dateText, { color: theme.textSecondary }]}>Ends on {new Date(election.end_date).toLocaleDateString()}</Text>
        </View>
        {userRole === 'admin' && (
          <TouchableOpacity style={[s.assignBtn, { backgroundColor: theme.primary }]} onPress={() => setAssignModalVisible(true)}>
            <Ionicons name="person-add-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={s.assignBtnText}>Assign Candidate</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={[s.sectionTitle, { color: theme.text }]}>Candidates</Text>
      <View style={s.candidateList}>
        {candidates.length > 0 ? (
          candidates.map((candidate) => (
            <View key={candidate._id} style={[s.candidateCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
              <View style={s.candidateHeader}>
                <View style={[s.avatarBox, { backgroundColor: theme.primary }]}>
                  <Text style={s.avatarText}>{candidate.user_id.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.candidateName, { color: theme.text }]}>{candidate.user_id.name}</Text>
                  <Text style={[s.candidateTag, { color: theme.primary }]}>Candidate</Text>
                </View>
              </View>

              <View style={[s.manifestoBox, { backgroundColor: theme.surfaceSubtle }]}>
                <Text style={[s.manifestoLabel, { color: theme.textMuted }]}>Manifesto</Text>
                <Text style={[s.manifestoText, { color: theme.textSecondary }]}>{candidate.manifesto}</Text>
              </View>

              {isOngoing && (
                <TouchableOpacity
                  style={[s.voteButton, { backgroundColor: theme.primary }, voting && { opacity: 0.6 }]}
                  onPress={() => handleVote(candidate._id)}
                  disabled={voting}
                >
                  <Ionicons name="checkbox-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.voteButtonText}>Cast My Vote</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <View style={[s.emptyCandidates, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="people-outline" size={48} color={theme.textMuted} />
            <Text style={[s.noCandidates, { color: theme.textMuted }]}>No candidates registered yet.</Text>
          </View>
        )}
      </View>

      <Modal visible={assignModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={24} style={{ flex: 1 }}>
          <Pressable style={s.modalOverlay} onPress={() => setAssignModalVisible(false)}>
            <View style={[s.modalContainer, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <View style={s.sheetHandle} />
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: theme.text }]}>Assign Candidate</Text>
                <TouchableOpacity onPress={() => setAssignModalVisible(false)} style={[s.closeBtn, { backgroundColor: theme.surfaceSubtle }]}>
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={s.modalScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={[s.modalLabel, { color: theme.textSecondary }]}>Select User</Text>
                <ScrollView style={s.userList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {assignableUsers.length > 0 ? (
                    assignableUsers.map((user) => (
                      <TouchableOpacity
                        key={user._id}
                        style={[s.userRow, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderLight }, selectedUserId === user._id && { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                        onPress={() => setSelectedUserId(user._id)}
                      >
                        <View style={[s.userAvatar, { backgroundColor: theme.primary }]}>
                          <Text style={s.userAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.userRowText, { color: selectedUserId === user._id ? theme.primary : theme.text }]}>{user.name}</Text>
                          <Text style={[s.userRowSubText, { color: theme.textMuted }]}>{user.email}</Text>
                        </View>
                        {selectedUserId === user._id && <Ionicons name="checkmark-circle" size={18} color={theme.primary} />}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={[s.emptyAssignText, { color: theme.textMuted }]}>All eligible users are already assigned as candidates.</Text>
                  )}
                </ScrollView>

                <Text style={[s.modalLabel, { color: theme.textSecondary }]}>Manifesto</Text>
                <TextInput
                  style={[s.manifestoInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
                  multiline
                  placeholder="Add candidate manifesto"
                  placeholderTextColor={theme.textMuted}
                  value={manifesto}
                  onChangeText={setManifesto}
                />

                <TouchableOpacity
                  style={[s.assignSubmitBtn, { backgroundColor: theme.primary }, (assigning || assignableUsers.length === 0) && { opacity: 0.6 }]}
                  onPress={handleAssignCandidate}
                  disabled={assigning || assignableUsers.length === 0}
                >
                  <Text style={s.assignSubmitText}>{assigning ? 'Assigning...' : 'Assign Candidate'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Pressable>
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
    infoCard: {
      padding: 24, borderRadius: 24, marginBottom: 24,
      shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
      borderWidth: 1,
    },
    infoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    electionTitle: { fontSize: 22, fontWeight: '800', flex: 1, marginRight: 10 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 14, fontWeight: '500' },
    assignBtn: { marginTop: 16, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    assignBtnText: { color: '#fff', fontWeight: '700' },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, marginLeft: 4 },
    candidateList: { gap: 16, paddingBottom: 40 },
    candidateCard: {
      padding: 20, borderRadius: 24,
      shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
      borderWidth: 1,
    },
    candidateHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
    avatarBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
    candidateName: { fontSize: 18, fontWeight: '700' },
    candidateTag: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    manifestoBox: { padding: 16, borderRadius: 16, marginBottom: 20 },
    manifestoLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
    manifestoText: { fontSize: 14, lineHeight: 22 },
    voteButton: {
      padding: 16, borderRadius: 16, alignItems: 'center',
      flexDirection: 'row', justifyContent: 'center',
    },
    voteButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    emptyCandidates: { alignItems: 'center', marginTop: 40, padding: 40, borderRadius: 24, borderStyle: 'dashed', borderWidth: 1 },
    noCandidates: { textAlign: 'center', marginTop: 12, fontWeight: '500' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
    modalContainer: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '90%' },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    modalScrollContent: { paddingBottom: 24 },
    modalLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
    userList: { maxHeight: 220, marginBottom: 14 },
    userRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1 },
    userRowText: { fontWeight: '600' },
    userRowSubText: { fontSize: 12, marginTop: 2 },
    userAvatar: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    userAvatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    emptyAssignText: { fontSize: 13, marginBottom: 8 },
    manifestoInput: { minHeight: 96, borderRadius: 12, padding: 12, textAlignVertical: 'top', borderWidth: 1, marginBottom: 14 },
    assignSubmitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    assignSubmitText: { color: '#fff', fontWeight: '700' },
  });
}

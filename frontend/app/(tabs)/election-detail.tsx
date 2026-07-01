import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import ElectionService, { ElectionDetails } from '@/services/ElectionService';
import { getAuthData } from '@/hooks/helperHooks';
import { apiGetSocietyUsers } from '@/services/SocietyService';
import { UserData } from '@/services/types';

export default function ElectionDetailScreen() {
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
      if (userData?.role) {
        setUserRole(userData.role);
      }

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

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

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
    <View style={[styles.container, styles.center, { backgroundColor: '#f8fafc' }]}>
        <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  );
  
  if (!details) return <View style={styles.container}><Text>Election not found.</Text></View>;

  const { election, candidates } = details;
  const existingCandidateIds = new Set(candidates.map((c) => c.user_id?._id));
  const assignableUsers = societyUsers.filter((u) => !existingCandidateIds.has(u._id));

  return (
    <ScrollView style={[styles.container, { backgroundColor: '#f8fafc' }]} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={20} color="#1e293b" />
        <Text style={styles.backBtnText}>Back to Elections</Text>
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <View style={styles.infoTop}>
            <Text style={styles.electionTitle}>{election.title}</Text>
            <View style={[styles.badge, { backgroundColor: election.status === 'ongoing' ? '#dcfce7' : '#f1f5f9' }]}>
              <Text style={[styles.badgeText, { color: election.status === 'ongoing' ? '#059669' : '#64748b' }]}>
                {election.status.toUpperCase()}
              </Text>
            </View>
        </View>
        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={16} color="#64748b" />
          <Text style={styles.dateText}>Ends on {new Date(election.end_date).toLocaleDateString()}</Text>
        </View>

        {userRole === 'admin' && (
          <TouchableOpacity style={styles.assignBtn} onPress={() => setAssignModalVisible(true)}>
            <Ionicons name="person-add-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.assignBtnText}>Assign Candidate</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Candidates</Text>
      <View style={styles.candidateList}>
        {candidates.length > 0 ? (
            candidates.map((candidate) => (
            <View key={candidate._id} style={styles.candidateCard}>
                <View style={styles.candidateHeader}>
                    <View style={styles.avatarBox}>
                        <Text style={styles.avatarText}>{candidate.user_id.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.candidateName}>{candidate.user_id.name}</Text>
                        <Text style={styles.candidateTag}>Candidate</Text>
                    </View>
                </View>
                
                <View style={styles.manifestoBox}>
                    <Text style={styles.manifestoLabel}>Manifesto</Text>
                    <Text style={styles.manifestoText}>{candidate.manifesto}</Text>
                </View>

                {election.status === 'ongoing' && (
                <TouchableOpacity 
                    style={[styles.voteButton, voting && { opacity: 0.6 }]} 
                    onPress={() => handleVote(candidate._id)}
                    disabled={voting}
                >
                    <Ionicons name="checkbox-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.voteButtonText}>Cast My Vote</Text>
                </TouchableOpacity>
                )}
            </View>
            ))
        ) : (
            <View style={styles.emptyCandidates}>
                <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                <Text style={styles.noCandidates}>No candidates registered yet.</Text>
            </View>
        )}
      </View>

      <Modal visible={assignModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={24}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setAssignModalVisible(false)}>
            <View style={styles.modalContainer} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign Candidate</Text>
                <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.modalLabel}>Select User</Text>
                <ScrollView style={styles.userList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {assignableUsers.length > 0 ? (
                    assignableUsers.map((user) => (
                      <TouchableOpacity
                        key={user._id}
                        style={[styles.userRow, selectedUserId === user._id && styles.userRowActive]}
                        onPress={() => setSelectedUserId(user._id)}
                      >
                        <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{user.name.charAt(0).toUpperCase()}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.userRowText, selectedUserId === user._id && styles.userRowTextActive]}>{user.name}</Text>
                          <Text style={styles.userRowSubText}>{user.email}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.emptyAssignText}>All eligible users are already assigned as candidates.</Text>
                  )}
                </ScrollView>

                <Text style={styles.modalLabel}>Manifesto</Text>
                <TextInput
                  style={styles.manifestoInput}
                  multiline
                  placeholder="Add candidate manifesto"
                  value={manifesto}
                  onChangeText={setManifesto}
                />

                <TouchableOpacity
                  style={[styles.assignSubmitBtn, (assigning || assignableUsers.length === 0) && { opacity: 0.6 }]}
                  onPress={handleAssignCandidate}
                  disabled={assigning || assignableUsers.length === 0}
                >
                  <Text style={styles.assignSubmitText}>{assigning ? 'Assigning...' : 'Assign Candidate'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 6 },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  
  infoCard: { 
    backgroundColor: '#fff', padding: 24, borderRadius: 24, marginBottom: 24,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
    borderWidth: 1, borderColor: '#f1f5f9'
  },
  infoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  electionTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', flex: 1, marginRight: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  assignBtn: {
    marginTop: 16,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  assignBtnText: { color: '#fff', fontWeight: '700' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 16, marginLeft: 4 },
  candidateList: { gap: 16, paddingBottom: 40 },
  candidateCard: { 
    backgroundColor: '#fff', padding: 20, borderRadius: 24,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
    borderWidth: 1, borderColor: '#f1f5f9'
  },
  candidateHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatarBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  candidateName: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  candidateTag: { fontSize: 12, color: '#4f46e5', fontWeight: '700', textTransform: 'uppercase' },
  
  manifestoBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 20 },
  manifestoLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  manifestoText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  
  voteButton: { 
    backgroundColor: '#4f46e5', padding: 16, borderRadius: 16, alignItems: 'center', 
    flexDirection: 'row', justifyContent: 'center',
    shadowColor: '#4f46e5', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4
  },
  voteButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  modalScrollContent: { paddingBottom: 24 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  userList: { maxHeight: 220, marginBottom: 14 },
  userRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f8fafc', marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  userRowActive: { backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#4f46e5' },
  userRowText: { color: '#1e293b', fontWeight: '600' },
  userRowSubText: { color: '#64748b', fontSize: 12, marginTop: 2 },
  userRowTextActive: { color: '#4f46e5' },
  userAvatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  emptyAssignText: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  manifestoInput: { minHeight: 96, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e2e8f0' },
  assignSubmitBtn: { marginTop: 14, backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  assignSubmitText: { color: '#fff', fontWeight: '700' },
  
  emptyCandidates: { alignItems: 'center', marginTop: 40, backgroundColor: '#fff', padding: 40, borderRadius: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1' },
  noCandidates: { textAlign: 'center', marginTop: 12, color: '#94a3b8', fontWeight: '500' }
});
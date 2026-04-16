import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import ElectionService, { ElectionDetails } from '@/services/ElectionService';

export default function ElectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [details, setDetails] = useState<ElectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const router = useRouter();

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      const res = await ElectionService.getElectionDetails(id);
      if (res.success) {
        setDetails(res.result);
      }
    } catch (error) {
      console.error("Error fetching election details:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
  
  emptyCandidates: { alignItems: 'center', marginTop: 40, backgroundColor: '#fff', padding: 40, borderRadius: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1' },
  noCandidates: { textAlign: 'center', marginTop: 12, color: '#94a3b8', fontWeight: '500' }
});
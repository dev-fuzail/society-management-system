import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import ElectionService, { ElectionDetails, Candidate } from '@/services/ElectionService';

export default function ElectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [details, setDetails] = useState<ElectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const router = useRouter();

  const fetchDetails = async () => {
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
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

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

  if (loading) return <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 50 }} />;
  if (!details) return <View style={styles.container}><Text>Election not found.</Text></View>;

  const { election, candidates } = details;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Election Details</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.electionTitle}>{election.title}</Text>
        <View style={[styles.badge, { backgroundColor: election.status === 'ongoing' ? '#C8E6C9' : '#FFCDD2' }]}>
          <Text style={styles.badgeText}>{election.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.dateText}>Ends on: {new Date(election.end_date).toLocaleDateString()}</Text>
      </View>

      <Text style={styles.sectionTitle}>Candidates</Text>
      {candidates.length > 0 ? (
        candidates.map((candidate) => (
          <View key={candidate._id} style={styles.candidateCard}>
            <View style={styles.candidateInfo}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{candidate.user_id.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.candidateName}>{candidate.user_id.name}</Text>
                <Text style={styles.manifestoText}>{candidate.manifesto}</Text>
              </View>
            </View>
            {election.status === 'ongoing' && (
              <TouchableOpacity 
                style={[styles.voteButton, voting && { opacity: 0.5 }]} 
                onPress={() => handleVote(candidate._id)}
                disabled={voting}
              >
                <Text style={styles.voteButtonText}>Vote</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      ) : (
        <Text style={styles.noCandidates}>No candidates registered for this election.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  infoCard: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 12, elevation: 2 },
  electionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  dateText: { color: '#666', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  candidateCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, elevation: 2 },
  candidateInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  candidateName: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 4 },
  manifestoText: { fontSize: 14, color: '#555', lineHeight: 20 },
  voteButton: { backgroundColor: '#4f46e5', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  voteButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  noCandidates: { textAlign: 'center', marginTop: 20, color: '#999' }
});

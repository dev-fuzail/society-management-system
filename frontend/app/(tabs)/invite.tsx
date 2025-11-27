import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { apiGenerateInviteLink, apiSendEmailInvite } from '../../services/AuthService';

export default function InviteScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState<'link' | 'email' | false>(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');

  const handleGenerateLink = async () => {
    setLoading('link');
    try {
      const response = await apiGenerateInviteLink();
      if (response.success) {
        Clipboard.setString(response.result.link);
        Alert.alert('Link Generated', 'The invitation link has been copied to your clipboard.');
      } else {
        Alert.alert('Error', response.message || 'Could not generate link.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setLoading('email');
    try {
      const response = await apiSendEmailInvite(email);
      if (response.success) {
        Alert.alert('Invite Sent', `An invitation has been sent to ${email}.`);
        setModalVisible(false);
        setEmail('');
      } else {
        Alert.alert('Error', response.message || 'Could not send invite.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Invite Members</Text>
        <Text style={styles.subtitle}>Choose how you want to invite new members to your society.</Text>

        {/* Generate Invite Link Card */}
        <TouchableOpacity style={styles.card} onPress={handleGenerateLink} disabled={!!loading}>
          <Ionicons name="link-outline" size={32} color="#4B7BEC" />
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Generate Invite Link</Text>
            <Text style={styles.cardDescription}>Create a shareable link that anyone can use to join.</Text>
          </View>
          {loading === 'link' ? <ActivityIndicator /> : <Ionicons name="chevron-forward" size={24} color="#888" />}
        </TouchableOpacity>

        {/* Invite by Email Card */}
        <TouchableOpacity style={styles.card} onPress={() => setModalVisible(true)} disabled={!!loading}>
          <Ionicons name="mail-outline" size={32} color="#4B7BEC" />
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Invite via Email</Text>
            <Text style={styles.cardDescription}>Send a personal invitation directly to someone's inbox.</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Email Invite Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Invite by Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter member's email address"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity
              style={[styles.button, loading === 'email' && styles.buttonDisabled]}
              onPress={handleSendEmail}
              disabled={loading === 'email'}
            >
              {loading === 'email' ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Invite</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f6fa' },
  container: { flex: 1, padding: 24 },

  // Titles
  title: { fontSize: 28, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 32 },

  // Generic Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  // Invite Card (distinct)
  inviteCard: {
    backgroundColor: '#4B7BEC',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  cardTextContainer: { flex: 1, marginLeft: 16 },

  // Card Texts
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  cardDescription: { fontSize: 14, color: '#555', marginTop: 4 },

  // Invite Card Texts
  inviteCardTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  inviteCardDescription: { fontSize: 14, color: '#e0e0ff', marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { width: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#000', marginBottom: 20 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: '#000',
    marginBottom: 20,
    backgroundColor: '#f5f6fa',
  },

  // Buttons
  button: {
    width: '100%',
    backgroundColor: '#4B7BEC',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelButton: { marginTop: 16 },
  cancelButtonText: { color: '#555', fontSize: 15 },
});

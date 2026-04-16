import { Ionicons } from '@expo/vector-icons';
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Invite Members</Text>
            <Text style={styles.subtitle}>Choose your preferred invitation method.</Text>
        </View>

        {/* Generate Invite Link Card */}
        <TouchableOpacity style={styles.card} onPress={handleGenerateLink} disabled={!!loading} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: '#eef2ff' }]}>
            <Ionicons name="link-outline" size={28} color="#4f46e5" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Share Invite Link</Text>
            <Text style={styles.cardDescription}>Quickly copy a shareable registration link.</Text>
          </View>
          {loading === 'link' ? <ActivityIndicator color="#4f46e5" /> : <Ionicons name="chevron-forward" size={20} color="#94a3b8" />}
        </TouchableOpacity>

        {/* Invite by Email Card */}
        <TouchableOpacity style={styles.card} onPress={() => setModalVisible(true)} disabled={!!loading} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: '#fdf2f8' }]}>
            <Ionicons name="mail-outline" size={28} color="#db2777" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Invite via Email</Text>
            <Text style={styles.cardDescription}>Send a formal invitation to their inbox.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Email Invite Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Email Invitation</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
            </View>

            <Text style={styles.label}>Recipient&apos;s Email</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. resident@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSendEmail}
              disabled={loading === 'email'}
            >
              {loading === 'email' ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Send Invitation</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', fontWeight: '500' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconCircle: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cardTextContainer: { flex: 1, marginLeft: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  cardDescription: { fontSize: 14, color: '#64748b', marginTop: 4, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4 },
  modalInput: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, fontSize: 16, color: '#1e293b', marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  submitBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Clipboard, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, Pressable } from 'react-native';
import { apiGenerateInviteLink, apiSendEmailInvite } from '../../services/AuthService';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

export default function InviteScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
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
    if (!email) { Alert.alert('Invalid Email', 'Please enter a valid email address.'); return; }
    setLoading('email');
    try {
      const response = await apiSendEmailInvite(email);
      if (response.success) {
        Alert.alert('Invite Sent', `An invitation has been sent to ${email}.`);
        setModalVisible(false); setEmail('');
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
    <SafeAreaView style={[s.safeArea, { backgroundColor: theme.bg }]}>
      <View style={s.container}>
        <View style={s.headerSection}>
          <Text style={[s.title, { color: theme.text }]}>Invite Members</Text>
          <Text style={[s.subtitle, { color: theme.textSecondary }]}>Choose your preferred invitation method.</Text>
        </View>

        <TouchableOpacity style={[s.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]} onPress={handleGenerateLink} disabled={!!loading} activeOpacity={0.7}>
          <View style={[s.iconCircle, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="link-outline" size={26} color={theme.primary} />
          </View>
          <View style={s.cardText}>
            <Text style={[s.cardTitle, { color: theme.text }]}>Share Invite Link</Text>
            <Text style={[s.cardDesc, { color: theme.textSecondary }]}>Quickly copy a shareable registration link.</Text>
          </View>
          {loading === 'link' ? <ActivityIndicator color={theme.primary} /> : <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />}
        </TouchableOpacity>

        <TouchableOpacity style={[s.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]} onPress={() => setModalVisible(true)} disabled={!!loading} activeOpacity={0.7}>
          <View style={[s.iconCircle, { backgroundColor: '#fdf2f8' }]}>
            <Ionicons name="mail-outline" size={26} color="#db2777" />
          </View>
          <View style={s.cardText}>
            <Text style={[s.cardTitle, { color: theme.text }]}>Invite via Email</Text>
            <Text style={[s.cardDesc, { color: theme.textSecondary }]}>Send a formal invitation to their inbox.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <Pressable style={s.overlay} onPress={() => setModalVisible(false)}>
          <View style={[s.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true} onResponderRelease={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: theme.text }]}>Email Invitation</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[s.closeBtn, { backgroundColor: theme.surfaceSubtle }]}>
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[s.label, { color: theme.textSecondary }]}>Recipient's Email</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.text }]}
              placeholder="e.g. resident@example.com"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity style={[s.submitBtn, { backgroundColor: theme.primary }]} onPress={handleSendEmail} disabled={loading === 'email'}>
              {loading === 'email' ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Send Invitation</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1, padding: 20 },
    headerSection: { marginBottom: 28 },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
    subtitle: { fontSize: 14, fontWeight: '500' },
    card: { borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 14, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    iconCircle: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    cardText: { flex: 1, marginLeft: 14 },
    cardTitle: { fontSize: 16, fontWeight: '700' },
    cardDesc: { fontSize: 13, marginTop: 3, fontWeight: '500' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 16 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
    sheetTitle: { fontSize: 20, fontWeight: '800' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 2 },
    input: { borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 22, borderWidth: 1 },
    submitBtn: { padding: 16, borderRadius: 14, alignItems: 'center' },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, Platform, Alert, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from "@expo/vector-icons";

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const [showContent, setShowContent] = useState(Platform.OS !== 'web'); // show immediately on mobile
  const [tokenChecked, setTokenChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          router.replace('/login');
          return;
        }
      } catch (error) {
        Alert.alert('Error', 'Something went wrong while verifying login.');
      } finally {
        setTokenChecked(true);
      }
    };
    verifyToken();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => setShowContent(true), 100); // delay for hydration
      return () => clearTimeout(timer);
    }
  }, []);

  if (!tokenChecked) return null;

  // Dummy data
  const totalPayments = 50000;
  const totalExpenses = 32000;
  const issuesCovered = 45;
  const issuesResolved = 30;
  const issuesUnderProcess = 15;

  const pieData = [
    { name: 'Total Payments', population: totalPayments, color: '#4CAF50', legendFontColor: '#333', legendFontSize: 14 },
    { name: 'Total Expenses', population: totalExpenses, color: '#F44336', legendFontColor: '#333', legendFontSize: 14 },
  ];

  const dummyCards = [
    { title: 'Total Payments', value: `$${totalPayments}` },
    { title: 'Total Expenses', value: `$${totalExpenses}` },
    { title: 'Issues Covered', value: `${issuesCovered}` },
    { title: 'Issues Resolved', value: `${issuesResolved}` },
    { title: 'Issues Under Process', value: `${issuesUnderProcess}` },
  ];

  const notices = [
    { title: 'Maintenance', text: 'Last date to pay maintenance: 10th Nov', color: '#FFEB3B' },
    { title: 'Elections', text: 'Upcoming elections: 20th Nov', color: '#FFCDD2' },
    { title: 'Water Supply', text: 'Water supply maintenance: 15th Nov', color: '#C8E6C9' },
  ];

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.inviteCard} onPress={() => router.push('/invite')}>
        <Ionicons name="person-add-outline" size={32} color={'#fff'} />
        <View style={styles.inviteCardTextContainer}>
          <Text style={styles.inviteCardTitle}>Invite New Members</Text>
          <Text style={styles.inviteCardDescription}>Send invitations to join the society.</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={'#000'} />
      </TouchableOpacity>

      {/* Noticeboard */}
      <View style={styles.noticeBoard}>
        <Text style={styles.noticeBoardTitle}>📌 Notices</Text>
        <View style={styles.noteCard}>
          {notices.map((notice, index) => (
            <View key={index} style={[styles.stickyNote, { backgroundColor: notice.color }]}>
              <Text style={styles.noteTitle}>{notice.title}</Text>
              <Text style={styles.noteText}>{notice.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {showContent && (
        <>
          {/* Pie Chart */}
          {Platform.OS !== 'web' && (
            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>Financial Overview</Text>
              <PieChart
                data={pieData}
                width={screenWidth * 0.85} // ✅ makes chart centered & fits smaller screens
                height={220}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="10"
                absolute
                chartConfig={{
                  color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                }}
              />
            </View>
          )}

          {/* Cards */}
          <View style={styles.cardsContainer}>
            {dummyCards.map((card, index) => (
              <View key={index} style={styles.card}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardValue}>{card.value}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f5f5f5' },

  // Noticeboard
  noticeBoard: { marginBottom: 20, padding: 16, borderRadius: 12, backgroundColor: '#fffbe6', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  noticeBoardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  notesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
  stickyNote: {
    width: '100%', // ✅ takes full width of container
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },  // noteTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  noteText: { fontSize: 13, color: '#333' },

  // Pie chart
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    width: '100%',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },

  // Generic Cards
  cardsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: { flexBasis: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#555' },
  cardValue: { fontSize: 18, fontWeight: '700', color: '#222', marginTop: 5 },
  cardTextContainer: { flex: 1, marginLeft: 16 },
  cardDescription: { fontSize: 14, color: '#000', marginTop: 4 },

  // Invite Card
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4
  },
  noteCard: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
    width: '100%',
  },
  noteTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  noteValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2196F3',
    marginTop: 4,
  },
  inviteCardTextContainer: { flex: 1, marginLeft: 16 },
  inviteCardTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  inviteCardDescription: { fontSize: 14, color: '#e0e7ff', marginTop: 4 },
});

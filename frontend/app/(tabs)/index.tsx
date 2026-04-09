import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, Platform, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from "@expo/vector-icons";
import { getAuthData } from '@/hooks/helperHooks'; // Import your auth helper
import { apiGetAnnouncements } from '@/services/AnnouncementService'; // Import the service
import { Announcement } from '@/services/types';
import { apiGetUserSocieties } from '@/services/SocietyService';
import { apiGetTickets } from '@/services/TicketService';

const screenWidth = Dimensions.get('window').width;

// Helper to cycle colors for announcements
const NOTICE_COLORS = ['#FFEB3B', '#FFCDD2', '#C8E6C9', '#BBDEFB', '#E1BEE7'];

export default function HomeScreen() {
  const [showContent, setShowContent] = useState(Platform.OS !== 'web');
  const [tokenChecked, setTokenChecked] = useState(false);
  const [realNotices, setRealNotices] = useState<Announcement[]>([]); // State for real data
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [ticketStats, setTicketStats] = useState({
    total: 0,
    resolved: 0,
    processing: 0
  });
  
  const router = useRouter();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const { token, userData } = await getAuthData();
        const res = await apiGetUserSocieties(userData.id);
        const selectedSociety = res.result[0];
        if (!token) {
          router.replace('/login');
          return;
        }
        
        // ✅ Fetch Real Announcements if user has a society
        if (userData && selectedSociety) {
          fetchAnnouncements(selectedSociety._id);
          fetchTicketStats(selectedSociety._id);
        } else {
          setLoadingNotices(false);
        }

      } finally {
        setTokenChecked(true);
      }
    };
    verifyToken();
  }, []);

  const fetchAnnouncements = async (societyId: string) => {
    try {
      const response = await apiGetAnnouncements(societyId);
      if (response.success) {
        setRealNotices(response.result);
      }
    } catch (error) {
      console.log("Error fetching notices:", error);
    } finally {
      setLoadingNotices(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!tokenChecked) return null;

  // Dummy data for charts/cards (kept as requested)
  const totalPayments = 50000;
  const totalExpenses = 32000;
  const issuesCovered = 45;
  const issuesResolved = 30;
  const issuesUnderProcess = 15;

  // const dashboardCards = [
  //   { title: 'Total Payments', value: `$${totalPayments}` },
  //   { title: 'Total Expenses', value: `$${totalExpenses}` },
  //   { title: 'Issues Covered', value: `${ticketStats.total}` },       // Real Total
  //   { title: 'Issues Resolved', value: `${ticketStats.resolved}` },    // Real Resolved
  //   { title: 'Issues Under Process', value: `${ticketStats.processing}` }, // Real Pending/In Progress
  // ];

  const pieData = [
    { name: 'Total Payments', population: totalPayments, color: '#4CAF50', legendFontColor: '#333', legendFontSize: 14 },
    { name: 'Total Expenses', population: totalExpenses, color: '#F44336', legendFontColor: '#333', legendFontSize: 14 },
  ];

  const dashboardCards = [
    { title: 'Total Payments', value: `$${totalPayments}` },
    { title: 'Total Expenses', value: `$${totalExpenses}` },
    { title: 'Issues Covered', value: `${issuesCovered}` },
    { title: 'Issues Resolved', value: `${issuesResolved}` },
    { title: 'Issues Under Process', value: `${issuesUnderProcess}` },
  ];

  const fetchTicketStats = async (societyId: string) => {
    try {
      const res = await apiGetTickets(societyId);
      
      if (res.success && res.result) {
        const tickets = res.result;

        // Calculate Stats
        const total = tickets.length;
        const resolved = tickets.filter((t: any) => t.status === 'Resolved' || t.status === 'Closed').length;
        const processing = tickets.filter((t: any) => t.status === 'Pending' || t.status === 'In Progress').length;

        setTicketStats({ total, resolved, processing });
      }
    } catch (error) {
      console.log("Error fetching tickets:", error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.inviteCard} onPress={() => router.push('/invite')}>
        <Ionicons name="person-add-outline" size={32} color={'#4f46e5'} />
        <View style={styles.CardTextContainer}>
          <Text style={styles.CardTitle}>Invite New Members</Text>
          <Text style={styles.CardDescription}>Send invitations to join the society.</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={'#888'} />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => router.push('/ticket-system')}
        activeOpacity={0.8}
      >
        <Ionicons name="megaphone-outline" size={32} color={'#D84315'} />
        <View style={styles.CardTextContainer}>
          <Text style={styles.CardTitle}>Lodge New Complaint</Text>
          <Text style={styles.CardDescription}>Register maintenance or structural issues.</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={'#888'} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, { borderLeftColor: '#059669' }]}
        onPress={() => router.push('/elections')}
        activeOpacity={0.8}
      >
        <Ionicons name="stats-chart-outline" size={32} color={'#059669'} />
        <View style={styles.CardTextContainer}>
          <Text style={styles.CardTitle}>Committee Elections</Text>
          <Text style={styles.CardDescription}>Participate in society decision making.</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={'#888'} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, { borderLeftColor: '#ea580c' }]}
        onPress={() => router.push('/service-providers')}
        activeOpacity={0.8}
      >
        <Ionicons name="construct-outline" size={32} color={'#ea580c'} />
        <View style={styles.CardTextContainer}>
          <Text style={styles.CardTitle}>Service Providers</Text>
          <Text style={styles.CardDescription}>Book plumbers, electricians and more.</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={'#888'} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, { borderLeftColor: '#8b5cf6' }]}
        onPress={() => router.push('/amenities')}
        activeOpacity={0.8}
      >
        <Ionicons name="gift-outline" size={32} color={'#8b5cf6'} />
        <View style={styles.CardTextContainer}>
          <Text style={styles.CardTitle}>Society Amenities</Text>
          <Text style={styles.CardDescription}>Book community hall, gym, and pool.</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={'#888'} />
      </TouchableOpacity>

      {/* ✅ Real Noticeboard Section */}
      <View style={styles.noticeBoard}>
        <Text style={styles.noticeBoardTitle}>📌 Notices</Text>
        
        {loadingNotices ? (
          <ActivityIndicator size="small" color="#000" />
        ) : realNotices.length > 0 ? (
          <View style={styles.noteCard}>
            {realNotices.map((notice, index) => (
              <View 
                key={notice._id} 
                style={[
                  styles.stickyNote, 
                  { backgroundColor: NOTICE_COLORS[index % NOTICE_COLORS.length] } // Cycle through colors
                ]}
              >
                <Text style={styles.noteTitle}>{notice.title}</Text>
                <Text style={styles.noteText}>{notice.message}</Text>
                <Text style={styles.noteDate}>
                  {new Date(notice.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontStyle: 'italic', color: '#666' }}>No new announcements.</Text>
        )}
      </View>

      {showContent && (
        <>
          {/* Pie Chart */}
          {Platform.OS !== 'web' && (
            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>Financial Overview</Text>
              <PieChart
                data={pieData}
                width={screenWidth * 0.85}
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
            {dashboardCards.map((card, index) => (
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
  stickyNote: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },  
  noteTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, color: '#333' },
  noteText: { fontSize: 14, color: '#444' },
  noteDate: { fontSize: 10, color: '#666', marginTop: 6, textAlign: 'right' },

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
  cardsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 30 },
  card: { flexBasis: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#555' },
  cardValue: { fontSize: 18, fontWeight: '700', color: '#222', marginTop: 5 },
  cardTextContainer: { flex: 1, marginLeft: 16 },
  cardDescription: { fontSize: 14, color: '#000', marginTop: 4 },

  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
  },
  noteCard: {
    // backgroundColor: '#fff', // Removed white bg here to let sticky notes shine on the yellow board
    // padding: 10,
    width: '100%',
  },
  CardTextContainer: { flex: 1, marginLeft: 16 },
  CardTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  CardDescription: { fontSize: 14, color: '#555', marginTop: 4 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#D84315',
  },
});
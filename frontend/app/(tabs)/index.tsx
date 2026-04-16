import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from "@expo/vector-icons";
import { getAuthData } from '@/hooks/helperHooks'; // Import your auth helper
import { apiGetAnnouncements } from '@/services/AnnouncementService'; // Import the service
import { Announcement } from '@/services/types';
import { apiGetUserSocieties } from '@/services/SocietyService';

const screenWidth = Dimensions.get('window').width;

// Helper to cycle colors for announcements
const NOTICE_COLORS = ['#FFEB3B', '#FFCDD2', '#C8E6C9', '#BBDEFB', '#E1BEE7'];

export default function HomeScreen() {
  const [showContent, setShowContent] = useState(Platform.OS !== 'web');
  const [tokenChecked, setTokenChecked] = useState(false);
  const [realNotices, setRealNotices] = useState<Announcement[]>([]); // State for real data
  const [loadingNotices, setLoadingNotices] = useState(true);
  
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
        } else {
          setLoadingNotices(false);
        }

      } finally {
        setTokenChecked(true);
      }
    };
    verifyToken();
  }, [router]);

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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Financial Overview Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Financial Overview</Text>
            <TouchableOpacity onPress={() => Alert.alert("Financials", "Detailed reports coming soon!")}>
                <Text style={styles.viewMoreText}>View Report</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.unifiedFinanceCard}>
            {showContent && Platform.OS !== 'web' && (
                <View style={styles.chartWrapper}>
                    <PieChart
                        data={pieData}
                        width={screenWidth - 80}
                        height={160}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="0"
                        center={[10, 0]}
                        absolute
                        chartConfig={{
                            color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                            labelColor: (opacity = 1) => `#1e293b`,
                        }}
                    />
                </View>
            )}

            <View style={styles.financeStatsRow}>
                <View style={styles.financeStatItem}>
                    <View style={[styles.statIndicator, { backgroundColor: '#10b981' }]} />
                    <View>
                        <Text style={styles.financeStatLabel}>Total Collection</Text>
                        <Text style={styles.financeStatValue}>${totalPayments.toLocaleString()}</Text>
                    </View>
                </View>
                <View style={styles.financeStatItem}>
                    <View style={[styles.statIndicator, { backgroundColor: '#ef4444' }]} />
                    <View>
                        <Text style={styles.financeStatLabel}>Total Expenses</Text>
                        <Text style={styles.financeStatValue}>${totalExpenses.toLocaleString()}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.balanceBarContainer}>
                <View style={styles.balanceBarBackground}>
                    <View style={[styles.balanceBarFill, { width: `${(totalExpenses / totalPayments) * 100}%` }]} />
                </View>
                <Text style={styles.balanceText}>
                    Usage: <Text style={{ fontWeight: '800', color: '#1e293b' }}>{Math.round((totalExpenses / totalPayments) * 100)}%</Text> of budget spent
                </Text>
            </View>
        </View>
      </View>

      {/* Main Modules Grid */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Society Modules</Text>
        <View style={styles.moduleGrid}>
          <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/apartments')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: '#eef2ff' }]}>
              <Ionicons name="business-outline" size={26} color="#4f46e5" />
            </View>
            <Text style={styles.moduleTitle}>Apartments</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/ticket-system')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="alert-circle-outline" size={26} color="#f97316" />
            </View>
            <Text style={styles.moduleTitle}>Tickets</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/elections')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="stats-chart-outline" size={26} color="#22c55e" />
            </View>
            <Text style={styles.moduleTitle}>Elections</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/invite')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: '#fdf2f8' }]}>
              <Ionicons name="person-add-outline" size={26} color="#db2777" />
            </View>
            <Text style={styles.moduleTitle}>Invite</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleCard} onPress={() => router.push('/profile')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: '#f5f5f5' }]}>
              <Ionicons name="person-circle-outline" size={26} color="#666" />
            </View>
            <Text style={styles.moduleTitle}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Issue Stats Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.statsRow}>
          {dashboardCards.slice(2).map((card, index) => (
            <View key={index} style={styles.miniStatCard}>
              <Text style={styles.miniStatValue}>{card.value}</Text>
              <Text style={styles.miniStatTitle}>{card.title.split(' ')[1]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Noticeboard Section */}
      <View style={[styles.sectionContainer, { marginBottom: 40 }]}>
        <View style={styles.noticeHeader}>
          <Text style={styles.sectionHeader}>Noticeboard</Text>
          <Ionicons name="notifications-outline" size={20} color="#666" />
        </View>
        
        {loadingNotices ? (
          <ActivityIndicator size="small" color="#4f46e5" style={{ marginVertical: 20 }} />
        ) : realNotices.length > 0 ? (
          <View style={styles.noticeList}>
            {realNotices.map((notice, index) => (
              <View 
                key={notice._id} 
                style={[
                  styles.noticeItem, 
                  { borderLeftColor: NOTICE_COLORS[index % NOTICE_COLORS.length] }
                ]}
              >
                <View style={styles.noticeContent}>
                  <Text style={styles.noticeTitle}>{notice.title}</Text>
                  <Text style={styles.noticeMessage} numberOfLines={2}>{notice.message}</Text>
                  <Text style={styles.noticeDate}>
                    {new Date(notice.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyNotice}>
            <Text style={styles.emptyNoticeText}>No new announcements.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.3,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f46e5',
  },
  unifiedFinanceCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  chartWrapper: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: -10,
  },
  financeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  financeStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  financeStatLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  financeStatValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 1,
  },
  balanceBarContainer: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  balanceBarBackground: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  balanceBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 4,
  },
  balanceText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  statTitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  moduleCard: {
    width: (screenWidth - 54) / 2,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  miniStatTitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  noticeList: {
    gap: 12,
  },
  noticeItem: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  noticeMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  noticeDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'right',
  },
  emptyNotice: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  emptyNoticeText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
});
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from "@expo/vector-icons";
import { getAuthData } from '@/hooks/helperHooks'; // Import your auth helper
import { apiGetAnnouncements } from '@/services/AnnouncementService'; // Import the service
import { Announcement } from '@/services/types';
import { apiGetUserSocieties } from '@/services/SocietyService';
import AmenityService, { Amenity } from '@/services/AmenityService';

const screenWidth = Dimensions.get('window').width;

// Helper to cycle colors for announcements
const NOTICE_COLORS = ['#FFEB3B', '#FFCDD2', '#C8E6C9', '#BBDEFB', '#E1BEE7'];

export default function HomeScreen() {
  const [showContent, setShowContent] = useState(Platform.OS !== 'web');
  const [tokenChecked, setTokenChecked] = useState(false);
  const [realNotices, setRealNotices] = useState<Announcement[]>([]); // State for real data
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [realAmenities, setRealAmenities] = useState<Amenity[]>([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  
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
          fetchAmenities(selectedSociety._id);
        } else {
          setLoadingNotices(false);
          setLoadingAmenities(false);
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

  const fetchAmenities = async (societyId: string) => {
    try {
      const response = await AmenityService.getAmenities(societyId);
      if (response.success) {
        setRealAmenities(response.result);
      }
    } catch (error) {
      console.log('Error fetching amenities:', error);
    } finally {
      setLoadingAmenities(false);
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
    { name: 'Total Payments', population: totalPayments, color: '#1E88E5', legendFontColor: '#333', legendFontSize: 14 },
    { name: 'Total Expenses', population: totalExpenses, color: '#00D39B', legendFontColor: '#333', legendFontSize: 14 },
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
            <TouchableOpacity onPress={() => Alert.alert("Reports", "Detailed financial reports are coming soon!")}>
              <Ionicons name="stats-chart" size={18} color="#4f46e5" />
            </TouchableOpacity>
        </View>

        <View style={styles.financeDashboardCard}>
            <View style={styles.balanceHeader}>
                <View>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={styles.balanceAmount}>${(totalPayments - totalExpenses).toLocaleString()}</Text>
                </View>
                <View style={styles.badgeContainer}>
                    <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>Q2 2026</Text>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.mainFinanceContent}>
                {showContent && Platform.OS !== 'web' && (
                    <View style={styles.chartSide}>
                      <PieChart
                        data={pieData}
                        width={screenWidth * 0.4}
                        height={120}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="20"
                        center={[0, 0]}
                        absolute
                        hasLegend={false}
                        chartConfig={{
                          color: (opacity = 1) => `rgba(30, 136, 229, ${opacity})`,
                        }}
                      />
                    </View>
                )}

                <View style={styles.statsSide}>
                    <View style={styles.financeStatBox}>
                      <View style={[styles.statDot, { backgroundColor: '#1E88E5' }]} />
                        <View>
                            <Text style={styles.statMiniLabel}>Collection</Text>
                        <Text style={[styles.statMiniValue, { color: '#1E88E5' }]}>+${totalPayments.toLocaleString()}</Text>
                        </View>
                    </View>
                    <View style={styles.financeStatBox}>
                      <View style={[styles.statDot, { backgroundColor: '#00D39B' }]} />
                        <View>
                            <Text style={styles.statMiniLabel}>Expenses</Text>
                        <Text style={[styles.statMiniValue, { color: '#00D39B' }]}>-${totalExpenses.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${(totalExpenses / totalPayments) * 100}%` }]} />
                </View>
                <View style={styles.progressLabels}>
                    <Text style={styles.progressText}>Budget Utilization</Text>
                    <Text style={styles.progressPercentage}>{Math.round((totalExpenses / totalPayments) * 100)}%</Text>
                </View>
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

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Amenities Snapshot</Text>
          <TouchableOpacity onPress={() => router.push('/amenities')}>
            <Text style={styles.viewMoreText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loadingAmenities ? (
          <ActivityIndicator size="small" color="#4f46e5" style={{ marginVertical: 12 }} />
        ) : realAmenities.length > 0 ? (
          realAmenities.slice(0, 3).map((amenity) => (
            <View key={amenity._id} style={styles.amenityItem}>
              <View style={styles.amenityIconWrap}>
                <Ionicons name={amenity.type === 'PER_USER' ? 'sync-outline' : 'calendar-outline'} size={16} color="#4f46e5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.amenityName}>{amenity.name}</Text>
                <Text style={styles.amenityType}>{amenity.type === 'PER_USER' ? 'Recurring facility' : 'One-time event space'}</Text>
              </View>
              <Text style={styles.amenityPrice}>${amenity.base_price}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyNotice}>
            <Text style={styles.emptyNoticeText}>No amenities found for this society.</Text>
          </View>
        )}
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
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eef2ff',
  },
  amenityIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  amenityName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  amenityType: { fontSize: 11, color: '#64748b' },
  amenityPrice: { fontSize: 14, fontWeight: '800', color: '#4f46e5' },
  financeDashboardCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
  },
  badgeContainer: {
    paddingTop: 4,
  },
  statusPill: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4f46e5',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 20,
  },
  mainFinanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartSide: {
    flex: 1,
    marginLeft: -20,
  },
  statsSide: {
    flex: 1,
    gap: 16,
  },
  financeStatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statMiniLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  statMiniValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
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
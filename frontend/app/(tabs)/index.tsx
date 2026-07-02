import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from "@expo/vector-icons";
import { getAuthData } from '@/hooks/helperHooks';
import { apiGetAnnouncements } from '@/services/AnnouncementService';
import { Announcement } from '@/services/types';
import { apiGetUserSocieties } from '@/services/SocietyService';
import AmenityService, { Amenity } from '@/services/AmenityService';
import { apiGetWalletReport, WalletReport } from '@/services/FinanceService';
import { useTheme } from '@/hooks/useTheme';
import { AppTheme } from '@/constants/theme';

const screenWidth = Dimensions.get('window').width;

const NOTICE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function HomeScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [showContent, setShowContent] = useState(Platform.OS !== 'web');
  const [tokenChecked, setTokenChecked] = useState(false);
  const [realNotices, setRealNotices] = useState<Announcement[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [realAmenities, setRealAmenities] = useState<Amenity[]>([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [walletReport, setWalletReport] = useState<WalletReport | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const verifyToken = async () => {
        try {
          const { token, userData } = await getAuthData();
          const res = await apiGetUserSocieties(userData.id);
          const selectedSociety = res.result[0];
          if (!token) { router.replace('/login'); return; }
          if (userData && selectedSociety) {
            setIsAdmin(userData.role === 'admin');
            fetchAnnouncements(selectedSociety._id);
            fetchAmenities(selectedSociety._id);
            fetchWalletReport(selectedSociety._id);
          } else {
            setLoadingNotices(false);
            setLoadingAmenities(false);
          }
        } finally {
          setTokenChecked(true);
        }
      };
      verifyToken();
    }, [router])
  );

  const fetchWalletReport = async (sid: string) => {
    try {
      const res = await apiGetWalletReport(sid);
      if (res.success) setWalletReport(res.result);
    } catch (e) { console.log("Error fetching wallet:", e); }
  };

  const fetchAnnouncements = async (societyId: string) => {
    try {
      const response = await apiGetAnnouncements(societyId);
      if (response.success) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        setRealNotices((response.result as Announcement[]).filter(a => new Date(a.created_at) >= monthStart).slice(0, 5));
      }
    } catch (e) { console.log("Error fetching notices:", e); }
    finally { setLoadingNotices(false); }
  };

  const fetchAmenities = async (societyId: string) => {
    try {
      const response = await AmenityService.getAmenities(societyId);
      if (response.success) setRealAmenities(response.result);
    } catch (e) { console.log('Error fetching amenities:', e); }
    finally { setLoadingAmenities(false); }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!tokenChecked) return null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTx = walletReport?.transactions.filter(tx => new Date(tx.created_at) >= monthStart) ?? [];
  const totalPayments = monthlyTx.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = monthlyTx.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const currentBalance = walletReport?.wallet.balance ?? 0;

  const pieData = [
    { name: 'Credits', population: totalPayments || 1, color: '#6366f1', legendFontColor: theme.text, legendFontSize: 14 },
    { name: 'Expenses', population: totalExpenses || 1, color: '#ef4444', legendFontColor: theme.text, legendFontSize: 14 },
  ];

  const MODULES = [
    { label: 'Maintenance', icon: 'card-outline' as const, bg: theme.infoLight, iconColor: theme.info, route: '/invoices' },
    { label: 'Apartments', icon: 'business-outline' as const, bg: theme.primaryLight, iconColor: theme.primary, route: '/apartments' },
    { label: 'Tickets', icon: 'alert-circle-outline' as const, bg: theme.warningLight, iconColor: theme.warning, route: '/ticket-system' },
    { label: 'Elections', icon: 'stats-chart-outline' as const, bg: theme.successLight, iconColor: theme.success, route: '/elections' },
    { label: 'Invite', icon: 'person-add-outline' as const, bg: '#fdf2f8', iconColor: '#db2777', route: '/invite' },
  ];

  return (
    <ScrollView style={[s.container, { backgroundColor: theme.bg }]} showsVerticalScrollIndicator={false}>

      {/* Financial Overview */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Financial Overview</Text>
          <TouchableOpacity onPress={() => router.push('/finance-report')} style={s.seeAllRow}>
            <Text style={[s.seeAll, { color: theme.primary }]}>Full Report</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <View style={[s.financeCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
          <View style={s.balanceRow}>
            <View>
              <Text style={[s.balanceLabel, { color: theme.textMuted }]}>Current Balance</Text>
              <Text style={[s.balanceAmount, { color: theme.text }]}>PKR {currentBalance.toLocaleString('en-PK')}</Text>
            </View>
            {isAdmin && (
              <TouchableOpacity style={[s.managePill, { backgroundColor: theme.primaryLight }]} onPress={() => router.push('/finance-report')}>
                <Ionicons name="stats-chart-outline" size={13} color={theme.primary} />
                <Text style={[s.managePillText, { color: theme.primary }]}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[s.divider, { backgroundColor: theme.borderLight }]} />

          <View style={s.financeContent}>
            {showContent && Platform.OS !== 'web' && (
              <View style={s.chartSide}>
                <PieChart
                  data={pieData}
                  width={screenWidth * 0.38}
                  height={110}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="10"
                  center={[0, 0]}
                  absolute
                  hasLegend={false}
                  chartConfig={{ color: (opacity = 1) => `rgba(99,102,241,${opacity})` }}
                />
              </View>
            )}
            <View style={s.statsSide}>
              <View style={s.statRow}>
                <View style={[s.statDot, { backgroundColor: '#6366f1' }]} />
                <View>
                  <Text style={[s.statLabel, { color: theme.textMuted }]}>This Month</Text>
                  <Text style={[s.statValue, { color: '#6366f1' }]}>+PKR {totalPayments.toLocaleString('en-PK')}</Text>
                </View>
              </View>
              <View style={s.statRow}>
                <View style={[s.statDot, { backgroundColor: theme.danger }]} />
                <View>
                  <Text style={[s.statLabel, { color: theme.textMuted }]}>Expenses</Text>
                  <Text style={[s.statValue, { color: theme.danger }]}>-PKR {totalExpenses.toLocaleString('en-PK')}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={s.progressWrap}>
            <View style={[s.progressBg, { backgroundColor: theme.borderLight }]}>
              <View style={[s.progressFill, { backgroundColor: theme.primary, width: `${totalPayments > 0 ? Math.min((totalExpenses / totalPayments) * 100, 100) : 0}%` }]} />
            </View>
            <View style={s.progressLabels}>
              <Text style={[s.progressText, { color: theme.textSecondary }]}>Budget Utilization</Text>
              <Text style={[s.progressPct, { color: theme.text }]}>{totalPayments > 0 ? Math.round((totalExpenses / totalPayments) * 100) : 0}%</Text>
            </View>
          </View>
        </View>
      </View>

      {/* SOS Card */}
      <View style={s.section}>
        <TouchableOpacity style={[s.sosCard, { backgroundColor: theme.surface }]} onPress={() => router.push('/sos')} activeOpacity={0.85}>
          <View style={s.sosLeft}>
            <View style={s.sosIconRing}>
              <Ionicons name="warning" size={22} color="#dc2626" />
            </View>
            <View>
              <Text style={[s.sosTitle, { color: theme.text }]}>Emergency SOS</Text>
              <Text style={[s.sosSub, { color: theme.textMuted }]}>Police · Ambulance · Fire · Rescue</Text>
            </View>
          </View>
          <View style={s.sosCallPill}>
            <Ionicons name="call" size={14} color="#fff" />
            <Text style={s.sosCallText}>Call</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Society Modules */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: theme.text }]}>Society Modules</Text>
        <View style={s.moduleGrid}>
          {MODULES.map((mod) => (
            <TouchableOpacity key={mod.label} style={[s.moduleCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]} onPress={() => router.push(mod.route as any)} activeOpacity={0.8}>
              <View style={[s.iconCircle, { backgroundColor: mod.bg }]}>
                <Ionicons name={mod.icon} size={26} color={mod.iconColor} />
              </View>
              <Text style={[s.moduleTitle, { color: theme.textSecondary }]}>{mod.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Amenities Snapshot */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Amenities</Text>
          <TouchableOpacity onPress={() => router.push('/amenities')}>
            <Text style={[s.seeAll, { color: theme.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>
        {loadingAmenities ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 12 }} />
        ) : realAmenities.length > 0 ? (
          realAmenities.slice(0, 3).map((amenity) => (
            <View key={amenity._id} style={[s.amenityRow, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
              <View style={[s.amenityIconWrap, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name={amenity.type === 'PER_USER' ? 'sync-outline' : 'calendar-outline'} size={16} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.amenityName, { color: theme.text }]}>{amenity.name}</Text>
                <Text style={[s.amenityType, { color: theme.textSecondary }]}>{amenity.type === 'PER_USER' ? 'Recurring' : 'One-time event'}</Text>
              </View>
              <Text style={[s.amenityPrice, { color: theme.primary }]}>PKR {amenity.base_price}</Text>
            </View>
          ))
        ) : (
          <View style={[s.emptyBox, { borderColor: theme.border }]}>
            <Text style={[s.emptyText, { color: theme.textMuted }]}>No amenities found.</Text>
          </View>
        )}
      </View>

      {/* Noticeboard */}
      <View style={[s.section, { marginBottom: 40 }]}>
        <View style={s.sectionHeaderRow}>
          <View>
            <Text style={[s.sectionTitle, { color: theme.text }]}>Noticeboard</Text>
            <Text style={[s.monthLabel, { color: theme.textMuted }]}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
          </View>
          <Ionicons name="notifications-outline" size={20} color={theme.textMuted} />
        </View>
        {loadingNotices ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
        ) : realNotices.length > 0 ? (
          realNotices.map((notice, index) => (
            <View key={notice._id} style={[s.noticeCard, { backgroundColor: theme.surface, borderLeftColor: NOTICE_COLORS[index % NOTICE_COLORS.length] }]}>
              <Text style={[s.noticeTitle, { color: theme.text }]}>{notice.title}</Text>
              <Text style={[s.noticeMessage, { color: theme.textSecondary }]} numberOfLines={2}>{notice.message}</Text>
              <Text style={[s.noticeDate, { color: theme.textMuted }]}>{new Date(notice.created_at).toLocaleDateString()}</Text>
            </View>
          ))
        ) : (
          <View style={[s.emptyBox, { borderColor: theme.border }]}>
            <Text style={[s.emptyText, { color: theme.textMuted }]}>No announcements this month.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },
    section: { marginTop: 24 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
    seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    seeAll: { fontSize: 13, fontWeight: '700' },
    monthLabel: { fontSize: 11, fontWeight: '600', marginTop: 1 },

    financeCard: { borderRadius: 24, padding: 22, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, elevation: 5 },
    balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
    balanceLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
    balanceAmount: { fontSize: 26, fontWeight: '800' },
    managePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    managePillText: { fontSize: 11, fontWeight: '800' },
    divider: { height: 1, marginBottom: 18 },
    financeContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    chartSide: { flex: 1, marginLeft: -14 },
    statsSide: { flex: 1, gap: 14 },
    statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statDot: { width: 8, height: 8, borderRadius: 4 },
    statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    statValue: { fontSize: 14, fontWeight: '800', marginTop: 1 },
    progressWrap: {},
    progressBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', borderRadius: 3 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    progressText: { fontSize: 12, fontWeight: '600' },
    progressPct: { fontSize: 12, fontWeight: '800' },

    sosCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: '#fecaca', shadowColor: '#dc2626', shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
    sosLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    sosIconRing: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fecaca' },
    sosTitle: { fontSize: 15, fontWeight: '800' },
    sosSub: { fontSize: 11, marginTop: 1, fontWeight: '500' },
    sosCallPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dc2626', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
    sosCallText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14, marginTop: 8 },
    moduleCard: { width: (screenWidth - 54) / 2, borderRadius: 20, padding: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    iconCircle: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    moduleTitle: { fontSize: 14, fontWeight: '700' },

    amenityRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
    amenityIconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    amenityName: { fontSize: 14, fontWeight: '700' },
    amenityType: { fontSize: 11, marginTop: 1 },
    amenityPrice: { fontSize: 14, fontWeight: '800' },

    noticeCard: { borderRadius: 14, padding: 16, marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    noticeTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    noticeMessage: { fontSize: 13, lineHeight: 19 },
    noticeDate: { fontSize: 11, fontWeight: '600', marginTop: 8, textAlign: 'right' },

    emptyBox: { padding: 28, alignItems: 'center', borderRadius: 14, borderStyle: 'dashed', borderWidth: 1 },
    emptyText: { fontSize: 14, fontWeight: '500' },
  });
}

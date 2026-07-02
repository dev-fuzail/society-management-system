import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Switch } from "react-native";
import { io, Socket } from "socket.io-client";
import { API_BASE } from "@/services/ApiService";
import { apiGetNotifications, apiGetNotificationAnalytics, apiGetNotificationPreferences, apiMarkAllNotificationsRead, apiMarkNotificationRead, apiUpdateNotificationPreferences } from "@/services/NotificationService";
import { NotificationAnalytics, NotificationItem, NotificationPreferences } from "@/services/types";
import { getAuthData } from "@/hooks/helperHooks";
import { useTheme } from "@/hooks/useTheme";
import { AppTheme } from "@/constants/theme";

const PAGE_SIZE = 20;

const TYPE_ICON: Record<string, any> = {
  announcements: 'megaphone-outline',
  elections: 'stats-chart-outline',
  maintenance_reminders: 'construct-outline',
  visitor_notifications: 'person-outline',
  payment_notifications: 'card-outline',
  general_society_updates: 'information-circle-outline',
};

const Notifications = () => {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    announcements: true, elections: true, maintenance_reminders: true,
    visitor_notifications: true, payment_notifications: true, general_society_updates: true,
  });
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const loadNotifications = useCallback(async (nextPage: number, replace = false) => {
    setLoading(true);
    try {
      const response = await apiGetNotifications({ page: nextPage, limit: PAGE_SIZE });
      if (response.success && response.result) {
        const newItems = response.result.items || [];
        setItems((prev) => (replace ? newItems : [...prev, ...newItems]));
        setPage(response.result.page);
        setTotal(response.result.total);
      }
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  const refresh = useCallback(() => { setRefreshing(true); loadNotifications(1, true); }, [loadNotifications]);
  const markRead = async (id: string) => { setItems((prev) => prev.map((item) => (item._id === id ? { ...item, is_read: true } : item))); await apiMarkNotificationRead(id); };
  const markAllRead = async () => { setItems((prev) => prev.map((item) => ({ ...item, is_read: true }))); await apiMarkAllNotificationsRead(); };

  const loadPreferences = useCallback(async () => {
    try {
      const [preferencesRes, analyticsRes, auth] = await Promise.all([
        apiGetNotificationPreferences(), apiGetNotificationAnalytics().catch(() => null), getAuthData(),
      ]);
      if (preferencesRes.success && preferencesRes.result?.preferences) setPreferences((prev) => ({ ...prev, ...preferencesRes.result.preferences }));
      if (auth.userData?.role === 'admin') {
        setIsAdmin(true);
        if (analyticsRes?.success && analyticsRes.result) setAnalytics(analyticsRes.result);
      }
    } catch {}
  }, []);

  const savePreferences = async () => {
    try {
      setIsSavingPreferences(true);
      const response = await apiUpdateNotificationPreferences(preferences);
      if (response.success && response.result?.preferences) setPreferences((prev) => ({ ...prev, ...response.result.preferences }));
    } finally { setIsSavingPreferences(false); }
  };

  useEffect(() => { loadNotifications(1, true); loadPreferences(); }, [loadNotifications]);

  useEffect(() => {
    const initSocket = async () => {
      const { userData } = await getAuthData();
      if (!userData) return;
      const socket = io(API_BASE); socketRef.current = socket;
      socket.on("connect", () => { socket.emit("registerUser", { userId: userData._id || userData.id, societyId: userData.society_id }); });
      socket.on("notification:new", (notification: NotificationItem) => { setItems((prev) => [notification, ...prev]); setTotal((prev) => prev + 1); });
    };
    initSocket();
    return () => { socketRef.current?.disconnect(); socketRef.current = null; };
  }, []);

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[s.notifCard, { backgroundColor: item.is_read ? theme.surfaceSubtle : theme.surface, borderColor: item.is_read ? theme.borderLight : theme.primaryMid }]}
      onPress={() => markRead(item._id)}
    >
      <View style={[s.notifIconBox, { backgroundColor: theme.primaryLight }]}>
        <Ionicons name="notifications-outline" size={18} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.notifHeaderRow}>
          <Text style={[s.notifTitle, { color: theme.text }]}>{item.title}</Text>
          {!item.is_read && <View style={[s.unreadDot, { backgroundColor: theme.primary }]} />}
        </View>
        <Text style={[s.notifMsg, { color: theme.textSecondary }]}>{item.message}</Text>
        <Text style={[s.notifMeta, { color: theme.textMuted }]}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  const PREF_ITEMS: [keyof NotificationPreferences, string][] = [
    ['announcements', 'Announcements'], ['elections', 'Elections'],
    ['maintenance_reminders', 'Maintenance Reminders'], ['visitor_notifications', 'Visitor Notifications'],
    ['payment_notifications', 'Payment Notifications'], ['general_society_updates', 'Society Updates'],
  ];

  const header = (
    <View>
      <View style={s.topRow}>
        <Text style={[s.topTitle, { color: theme.text }]}>Notifications</Text>
        <TouchableOpacity style={[s.markAllBtn, { backgroundColor: theme.primaryLight }]} onPress={markAllRead}>
          <Text style={[s.markAllText, { color: theme.primary }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[s.sectionTitle, { color: theme.text }]}>Notification Preferences</Text>
        {PREF_ITEMS.map(([key, label]) => (
          <View key={key} style={[s.prefRow, { borderBottomColor: theme.borderLight }]}>
            <View style={[s.prefIcon, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name={TYPE_ICON[key] ?? 'notifications-outline'} size={14} color={theme.primary} />
            </View>
            <Text style={[s.prefLabel, { color: theme.text }]}>{label}</Text>
            <Switch
              value={preferences[key]}
              onValueChange={(value) => setPreferences((prev) => ({ ...prev, [key]: value }))}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={preferences[key] ? '#fff' : '#fff'}
            />
          </View>
        ))}
        <TouchableOpacity style={[s.saveBtn, { backgroundColor: theme.primary }]} onPress={savePreferences} disabled={isSavingPreferences}>
          {isSavingPreferences ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save Preferences</Text>}
        </TouchableOpacity>
      </View>

      {isAdmin && analytics && (
        <View style={[s.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Analytics</Text>
          <View style={s.statsGrid}>
            {[
              { v: analytics.total_notifications, l: 'Total' },
              { v: analytics.delivered_notifications, l: 'Delivered' },
              { v: analytics.failed_notifications, l: 'Failed' },
              { v: analytics.read_notifications, l: 'Read' },
            ].map(({ v, l }) => (
              <View key={l} style={[s.statTile, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderLight }]}>
                <Text style={[s.statValue, { color: theme.primary }]}>{v}</Text>
                <Text style={[s.statLabel, { color: theme.textMuted }]}>{l}</Text>
              </View>
            ))}
          </View>
          {analytics.type_breakdown.map((item) => (
            <View key={item._id} style={[s.breakRow, { borderTopColor: theme.borderLight }]}>
              <Text style={[s.breakLabel, { color: theme.textSecondary }]}>{item._id}</Text>
              <Text style={[s.breakValue, { color: theme.text }]}>{item.count}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[s.feedHeader, { color: theme.text }]}>Recent</Text>
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      {loading && items.length === 0 ? (
        <View style={s.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} />}
          onEndReached={() => { if (items.length < total && !loading) loadNotifications(page + 1); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="notifications-off-outline" size={44} color={theme.textMuted} />
              <Text style={[s.emptyText, { color: theme.textMuted }]}>No notifications yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    topTitle: { fontSize: 22, fontWeight: '800' },
    markAllBtn: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
    markAllText: { fontSize: 13, fontWeight: '700' },
    sectionCard: { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1 },
    sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 14 },
    prefRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
    prefIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    prefLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
    saveBtn: { marginTop: 14, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    statTile: { flexBasis: '47%', borderRadius: 14, padding: 14, borderWidth: 1 },
    statValue: { fontSize: 22, fontWeight: '900' },
    statLabel: { fontSize: 12, marginTop: 2, fontWeight: '600' },
    breakRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1 },
    breakLabel: { textTransform: 'capitalize', fontSize: 13 },
    breakValue: { fontWeight: '700', fontSize: 13 },
    feedHeader: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
    notifCard: { flexDirection: 'row', gap: 12, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    notifIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    notifHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    notifTitle: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 6 },
    unreadDot: { width: 8, height: 8, borderRadius: 4 },
    notifMsg: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
    notifMeta: { fontSize: 11 },
    empty: { alignItems: 'center', paddingTop: 40, gap: 10 },
    emptyText: { fontSize: 15, fontWeight: '500' },
  });
}

// Needed for JSX in the component
import { Ionicons } from "@expo/vector-icons";

export default Notifications;

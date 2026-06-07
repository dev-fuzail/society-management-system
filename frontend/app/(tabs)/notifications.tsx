import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { io, Socket } from "socket.io-client";

import { API_BASE } from "@/services/ApiService";
import {
  apiGetNotifications,
  apiGetNotificationAnalytics,
  apiGetNotificationPreferences,
  apiMarkAllNotificationsRead,
  apiMarkNotificationRead,
  apiUpdateNotificationPreferences,
} from "@/services/NotificationService";
import { NotificationAnalytics, NotificationItem, NotificationPreferences } from "@/services/types";
import { getAuthData } from "@/hooks/helperHooks";

const PAGE_SIZE = 20;

const Notifications = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    announcements: true,
    elections: true,
    maintenance_reminders: true,
    visitor_notifications: true,
    payment_notifications: true,
    general_society_updates: true,
  });
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const loadNotifications = useCallback(async (nextPage: number, replace = false) => {
    setLoading(true);
    try {
      const response = await apiGetNotifications({
        page: nextPage,
        limit: PAGE_SIZE,
      });

      if (response.success && response.result) {
        const newItems = response.result.items || [];
        setItems((prev) => (replace ? newItems : [...prev, ...newItems]));
        setPage(response.result.page);
        setTotal(response.result.total);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications(1, true);
  }, [loadNotifications]);

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item._id === id ? { ...item, is_read: true } : item))
    );
    await apiMarkNotificationRead(id);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    await apiMarkAllNotificationsRead();
  };

  const loadPreferences = useCallback(async () => {
    try {
      const [preferencesRes, analyticsRes, auth] = await Promise.all([
        apiGetNotificationPreferences(),
        apiGetNotificationAnalytics().catch(() => null),
        getAuthData(),
      ]);

      if (preferencesRes.success && preferencesRes.result?.preferences) {
        setPreferences((prev) => ({ ...prev, ...preferencesRes.result.preferences }));
      }

      if (auth.userData?.role === 'admin') {
        setIsAdmin(true);
        if (analyticsRes?.success && analyticsRes.result) {
          setAnalytics(analyticsRes.result);
        }
      }
    } catch {
      // Keep defaults if preference lookup fails.
    }
  }, []);

  const savePreferences = async () => {
    try {
      setIsSavingPreferences(true);
      const response = await apiUpdateNotificationPreferences(preferences);
      if (response.success && response.result?.preferences) {
        setPreferences((prev) => ({ ...prev, ...response.result.preferences }));
      }
    } finally {
      setIsSavingPreferences(false);
    }
  };

  useEffect(() => {
    loadNotifications(1, true);
    loadPreferences();
  }, [loadNotifications]);

  useEffect(() => {
    const initSocket = async () => {
      const { userData } = await getAuthData();
      if (!userData) return;

      const socket = io(API_BASE);
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("registerUser", {
          userId: userData._id || userData.id,
          societyId: userData.society_id,
        });
      });

      socket.on("notification:new", (notification: NotificationItem) => {
        setItems((prev) => [notification, ...prev]);
        setTotal((prev) => prev + 1);
      });
    };

    initSocket();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const renderItem = ({ item }: { item: NotificationItem }) => {
    return (
      <TouchableOpacity
        style={[styles.card, item.is_read ? styles.cardRead : styles.cardUnread]}
        onPress={() => markRead(item._id)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.cardMessage}>{item.message}</Text>
        <Text style={styles.cardMeta}>{new Date(item.created_at).toLocaleString()}</Text>
      </TouchableOpacity>
    );
  };

  const canLoadMore = items.length < total && !loading;

  const header = (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.headerAction}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        {([
          ["announcements", "Announcements"],
          ["elections", "Elections"],
          ["maintenance_reminders", "Maintenance Reminders"],
          ["visitor_notifications", "Visitor Notifications"],
          ["payment_notifications", "Payment Notifications"],
          ["general_society_updates", "General Society Updates"],
        ] as const).map(([key, label]) => (
          <View key={key} style={styles.preferenceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.preferenceLabel}>{label}</Text>
            </View>
            <Switch
              value={preferences[key]}
              onValueChange={(value) => setPreferences((prev) => ({ ...prev, [key]: value }))}
              trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
            />
          </View>
        ))}
        <TouchableOpacity style={styles.savePreferencesBtn} onPress={savePreferences} disabled={isSavingPreferences}>
          {isSavingPreferences ? <ActivityIndicator color="#fff" /> : <Text style={styles.savePreferencesText}>Save Preferences</Text>}
        </TouchableOpacity>
      </View>

      {isAdmin && analytics && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notification Analytics</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsTile}><Text style={styles.analyticsValue}>{analytics.total_notifications}</Text><Text style={styles.analyticsLabel}>Total</Text></View>
            <View style={styles.analyticsTile}><Text style={styles.analyticsValue}>{analytics.delivered_notifications}</Text><Text style={styles.analyticsLabel}>Delivered</Text></View>
            <View style={styles.analyticsTile}><Text style={styles.analyticsValue}>{analytics.failed_notifications}</Text><Text style={styles.analyticsLabel}>Failed</Text></View>
            <View style={styles.analyticsTile}><Text style={styles.analyticsValue}>{analytics.read_notifications}</Text><Text style={styles.analyticsLabel}>Read</Text></View>
          </View>
          {analytics.type_breakdown.map((item) => (
            <View key={item._id} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{item._id}</Text>
              <Text style={styles.breakdownValue}>{item.count}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && items.length === 0 ? (
        <ActivityIndicator size="small" color="#2563eb" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          onEndReached={() => {
            if (canLoadMore) loadNotifications(page + 1);
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No notifications yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerAction: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  preferenceLabel: {
    color: '#0f172a',
    fontWeight: '600',
  },
  savePreferencesBtn: {
    backgroundColor: '#0f766e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  savePreferencesText: {
    color: '#fff',
    fontWeight: '700',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  analyticsTile: {
    flexBasis: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  analyticsLabel: {
    color: '#64748b',
    marginTop: 4,
    fontSize: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  breakdownLabel: {
    color: '#334155',
    textTransform: 'capitalize',
  },
  breakdownValue: {
    color: '#0f172a',
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardUnread: {
    backgroundColor: "#ffffff",
    borderColor: "#dbeafe",
  },
  cardRead: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardMessage: {
    fontSize: 13,
    color: "#334155",
    marginBottom: 8,
  },
  cardMeta: {
    fontSize: 11,
    color: "#94a3b8",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563eb",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    color: "#64748b",
  },
});

export default Notifications;

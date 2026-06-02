import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { io, Socket } from "socket.io-client";

import { API_BASE } from "@/services/ApiService";
import {
  apiGetNotifications,
  apiMarkAllNotificationsRead,
  apiMarkNotificationRead,
} from "@/services/NotificationService";
import { NotificationItem } from "@/services/types";
import { getAuthData } from "@/hooks/helperHooks";

const PAGE_SIZE = 20;

const Notifications = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  useEffect(() => {
    loadNotifications(1, true);
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

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.headerAction}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator size="small" color="#2563eb" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
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

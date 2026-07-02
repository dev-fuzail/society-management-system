import { Tabs, router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  View,
  Text,
  Pressable,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { HapticTab } from "@/components/haptic-tab";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserData } from "@/services/types";
import * as Notifications from "expo-notifications";
import { apiRegisterDeviceToken } from "@/services/NotificationService";
// React Native Firebase is native-only — guard every call with Platform check
if (Platform.OS !== "web") {
  const messaging = require("@react-native-firebase/messaging").default;
  // Runs when a push arrives while the app is backgrounded or killed. Messages
  // that include a `notification` payload are auto-displayed by the OS regardless
  // of this handler; it still needs to be registered so the JS engine handles
  // delivery instead of dropping it.
  messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
    console.log("[Push] Background message received:", remoteMessage?.messageId);
  });
}

// Controls how notifications behave when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const [isAdminMenuVisible, setIsAdminMenuVisible] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [tokenRegistered, setTokenRegistered] = useState(false);

  const handleMenuNavigate = (path: any) => {
    setIsProfileMenuVisible(false);
    setIsAdminMenuVisible(false);
    router.push(path);
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        let userDataString;
        if (Platform.OS === "web") {
          userDataString = localStorage.getItem("userData");
        } else {
          userDataString = await AsyncStorage.getItem("userData");
        }

        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUser(userData);
        }
      } catch (error) {
        console.error("Failed to load user data", error);
        Alert.alert("Error", "Could not load profile data.");
      }
    };

    loadUserData();
  }, []);

  // Android needs an explicit channel for FCM notifications to display with
  // proper sound/priority, and FCM messages arriving while the app is open
  // (foreground) are never auto-displayed by the OS — they only fire the
  // onMessage listener, so we manually surface them as a local notification.
  useEffect(() => {
    if (Platform.OS === "web") return;

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const messaging = require("@react-native-firebase/messaging").default;
    const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage?.notification?.title || "New notification",
          body: remoteMessage?.notification?.body || "",
          data: remoteMessage?.data || {},
        },
        trigger: null,
      });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const registerPushToken = async () => {
      if (!user || tokenRegistered || Platform.OS === "web") return;

      try {
        const permission = await Notifications.getPermissionsAsync();
        let finalStatus = permission.status;

        if (finalStatus !== "granted") {
          const request = await Notifications.requestPermissionsAsync();
          finalStatus = request.status;
        }

        if (finalStatus !== "granted") {
          return;
        }

        const messaging = require("@react-native-firebase/messaging").default;
        const token = await messaging().getToken();

        if (token) {
          await apiRegisterDeviceToken(token, Platform.OS);
          setTokenRegistered(true);
        }
      } catch (error) {
        console.warn("[Push] Could not register push token:", error);
      }
    };

    registerPushToken();
  }, [user, tokenRegistered]);

  const isAdmin = user?.role === "admin";

  return (
    <>
      {/* Profile Menu Modal (Right) */}
      <Modal
        visible={isProfileMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsProfileMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsProfileMenuVisible(false)}
        >
          <View
            style={[
              styles.profileMenuContainer,
              { backgroundColor: theme.surface, borderColor: theme.border, top: 60 + insets.top },
            ]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuNavigate("/notifications")}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.primary} style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: theme.text }]}>Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuNavigate("/profile")}
            >
              <Ionicons name="person-outline" size={20} color={theme.primary} style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: theme.text }]}>Profile</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Admin Hamburger Menu Modal (Left) */}
      <Modal
        visible={isAdminMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAdminMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsAdminMenuVisible(false)}
        >
          <View
            style={[
              styles.adminMenuContainer,
              { backgroundColor: theme.surface, borderColor: theme.border, top: 60 + insets.top },
            ]}
          >
            <Text style={[styles.adminMenuHeader, { color: theme.primary, borderBottomColor: theme.borderLight }]}>
              Admin Settings
            </Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuNavigate("/society-update")}
            >
              <Ionicons
                name="business-outline"
                size={20}
                color={theme.primary}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, { color: theme.text }]}>
                Society Update
              </Text>
            </TouchableOpacity>

            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuNavigate("/announcement")}
            >
              <Ionicons
                name="megaphone-outline"
                size={20}
                color={theme.primary}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, { color: theme.text }]}>
                Manage Announcements
              </Text>
            </TouchableOpacity>

            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuNavigate("/amenity-approvals")}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color={theme.primary}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, { color: theme.text }]}> 
                Amenity Approvals
              </Text>
            </TouchableOpacity>

            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuNavigate("/ticket-system")}
            >
              <Ionicons
                name="clipboard-outline"
                size={20}
                color={theme.primary}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, { color: theme.text }]}>
                Complaint Status
              </Text>
            </TouchableOpacity>

            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuNavigate("/society-payments")}
            >
              <Ionicons
                name="cash-outline"
                size={20}
                color={theme.primary}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, { color: theme.text }]}>
                Maintenance Payments
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Bottom Tabs */}
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.headerBg,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: theme.headerText,
          title:
            route.name === "index"
              ? "Living Sync"
              : route.name.charAt(0).toUpperCase() + route.name.slice(1).replace(/-/g, " "),
          headerTitleAlign: "center",
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 17,
            color: theme.headerText,
          },
          headerLeft: () => (
            isAdmin ? (
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => setIsAdminMenuVisible(true)}
              >
                <Ionicons name="menu-outline" size={24} color={theme.headerText} />
              </TouchableOpacity>
            ) : (
              <View style={styles.logoWrap}>
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.logoIcon}
                  resizeMode="contain"
                />
              </View>
            )
          ),
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setIsProfileMenuVisible(true)}
            >
              <Ionicons name="person-circle-outline" size={26} color={theme.headerText} />
            </TouchableOpacity>
          ),
          tabBarStyle: {
            backgroundColor: theme.tabBg,
            borderTopColor: theme.tabBorder,
            borderTopWidth: 1,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
            paddingTop: 8,
            elevation: 12,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 16,
          },
          tabBarActiveTintColor: theme.tabActive,
          tabBarInactiveTintColor: theme.tabInactive,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
          tabBarButton: HapticTab,
        })}
      >
        {/* Left - Home */}
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Center - Community Chat */}
        <Tabs.Screen
          name="community-chat"
          options={{
            title: "Community Chat",
            tabBarLabel: "Chats",
            tabBarIcon: ({ color }) => (
              <Ionicons name="chatbubbles-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Services Screen */}
        <Tabs.Screen
          name="service-providers"
          options={{
            title: "Services",
            tabBarLabel: "Services",
            tabBarIcon: ({ color }) => (
              <Ionicons name="construct-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Amenities Screen */}
        <Tabs.Screen
          name="amenities"
          options={{
            title: "Amenities",
            tabBarLabel: "Amenities",
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Hidden from Bottom Bar */}
        <Tabs.Screen
          name="apartments"
          options={{
            title: "My Apartments",
            href: null,
          }}
        />
        <Tabs.Screen
          name="invite"
          options={{
            title: "Invite Members",
            href: null,
          }}
        />
        <Tabs.Screen
          name="apartment-form"
          options={{
            title: "Apartment Form",
            href: null,
          }}
        />
        <Tabs.Screen
          name="ticket-detail"
          options={{
            title: "Ticket Detail",
            href: null,
          }}
        />
        <Tabs.Screen
          name="ticket-system"
          options={{
            title: "Tickets",
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile Management",
            href: null,
          }}
        />
        <Tabs.Screen
          name="society-update"
          options={{
            title: "Society Update",
            href: null,
          }}
        />
        <Tabs.Screen
          name="announcement"
          options={{
            title: "Announcements",
            href: null,
          }}
        />
        <Tabs.Screen
          name="elections"
          options={{
            title: "Elections",
            href: null,
          }}
        />
        <Tabs.Screen
          name="election-detail"
          options={{
            title: "Election Detail",
            href: null,
          }}
        />
        <Tabs.Screen
          name="service-bookings"
          options={{
            title: "Service Bookings",
            href: null,
          }}
        />
        <Tabs.Screen
          name="amenity-bookings"
          options={{
            title: "Amenity Bookings",
            href: null,
          }}
        />
        <Tabs.Screen
          name="amenity-approvals"
          options={{
            title: "Amenity Approvals",
            href: null,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: "Notifications",
            href: null,
          }}
        />
        <Tabs.Screen
          name="society-payments"
          options={{
            title: "Maintenance Payments",
            href: null,
          }}
        />
        <Tabs.Screen
          name="finance-report"
          options={{ title: "Finance Report", href: null }}
        />
        <Tabs.Screen
          name="invoices"
          options={{ title: "Invoices", href: null }}
        />
        <Tabs.Screen
          name="maintenance-payment"
          options={{ title: "Pay Invoice", href: null }}
        />
        <Tabs.Screen
          name="sos"
          options={{ title: "Emergency SOS", href: null }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  profileMenuContainer: {
    position: "absolute", top: 60, right: 16, width: 220,
    borderWidth: 1, borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 12, overflow: "hidden",
  },
  adminMenuContainer: {
    position: "absolute", top: 60, left: 16, width: 250,
    borderWidth: 1, borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 12, overflow: "hidden",
  },
  adminMenuHeader: {
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2,
    borderBottomWidth: 1,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 13,
  },
  menuIcon: { marginRight: 12 },
  menuText: { fontSize: 14, fontWeight: "600" },
  separator: { height: 1, width: "100%", opacity: 0.08 },
  headerBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  logoWrap: { paddingHorizontal: 12, paddingVertical: 4 },
  logoIcon: { width: 32, height: 32 },
});

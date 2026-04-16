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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { HapticTab } from "@/components/haptic-tab";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserData } from "@/services/types";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const [isAdminMenuVisible, setIsAdminMenuVisible] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);

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
              { backgroundColor: theme.background, borderColor: theme.icon, top: 60 + insets.top },
            ]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuNavigate("/profile")}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={theme.text}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, { color: theme.text }]}>
                Profile Management
              </Text>
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
              { backgroundColor: theme.background, borderColor: theme.icon, top: 60 + insets.top },
            ]}
          >
            <Text style={[styles.adminMenuHeader, { color: theme.text, borderBottomColor: theme.icon }]}>
              Admin Settings
            </Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuNavigate("/society-update")}
            >
              <Ionicons
                name="business-outline"
                size={20}
                color={theme.text}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, { color: theme.text }]}>
                Society Update
              </Text>
            </TouchableOpacity>

            <View style={[styles.separator, { backgroundColor: theme.icon }]} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuNavigate("/announcement")}
            >
              <Ionicons
                name="megaphone-outline"
                size={20}
                color={theme.text}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, { color: theme.text }]}>
                Manage Announcements
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
            backgroundColor: theme.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.icon + '20',
          },
          title:
            route.name === "index"
              ? "Living Sync"
              : route.name.charAt(0).toUpperCase() + route.name.slice(1).replace("-", " "),
          headerTitleAlign: "center",
          headerLeft: () => (
            isAdmin ? (
              <TouchableOpacity
                style={{ marginLeft: 16 }}
                onPress={() => setIsAdminMenuVisible(true)}
              >
                <Ionicons
                  name="menu-outline"
                  size={28}
                  color={theme.text}
                />
              </TouchableOpacity>
            ) : (
              <Image
                source={require("@/assets/images/icon.png")}
                style={{ width: 32, height: 32, marginLeft: 16 }}
                resizeMode="contain"
              />
            )
          ),
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => setIsProfileMenuVisible(true)}
            >
              <Ionicons
                name="person-circle-outline"
                size={28}
                color={theme.text}
              />
            </TouchableOpacity>
          ),
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopColor: theme.icon + '20',
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: "#2563eb",
          tabBarInactiveTintColor: theme.icon,
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
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  profileMenuContainer: {
    position: "absolute",
    top: 60,
    right: 16,
    width: 220,
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  adminMenuContainer: {
    position: "absolute",
    top: 60,
    left: 16,
    width: 240,
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  adminMenuHeader: {
    padding: 16,
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 1,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: "500",
  },
  separator: {
    height: 1,
    width: "100%",
    opacity: 0.1,
  },
  centerTab: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 50,
    marginBottom: 25,
    elevation: 5,
  },
});

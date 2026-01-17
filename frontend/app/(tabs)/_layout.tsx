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
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { HapticTab } from "@/components/haptic-tab";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserData } from "@/services/types";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);

  const handleMenuNavigate = (path: string) => {
    setIsMenuVisible(false);
    router.push(`/${path.replace(/^\//, "")}`);
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
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  return (
    <>
      {/* Custom Dropdown Menu Modal */}
      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsMenuVisible(false)}
        >
          <View
            style={[
              styles.menuContainer,
              { backgroundColor: theme.background, borderColor: theme.icon },
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

            <View style={[styles.separator, { backgroundColor: theme.icon }]} />

            {user?.role === "admin" && (
              <>
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
                <View
                  style={[styles.separator, { backgroundColor: theme.icon }]}
                />
              </>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuNavigate("/forgot-password")}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={theme.text}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, { color: theme.text }]}>
                Forgot Password
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
          },
          title:
            route.name === "index"
              ? "Dashboard"
              : route.name.charAt(0).toUpperCase() + route.name.slice(1),
          headerTitleAlign: "left",
          headerLeft: () => (
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 32, height: 32, marginHorizontal: 16 }}
              resizeMode="contain"
            />
          ),
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => setIsMenuVisible(true)}
            >
              <Ionicons
                name="person-circle-outline"
                size={28}
                color={theme.text}
              />
            </TouchableOpacity>
          ),
          tabBarActiveTintColor: theme.tint,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopWidth: 0.5,
            borderTopColor: theme.icon,
            paddingBottom: 5, // Add some padding for the icons
          },
          tabBarButton: HapticTab,
        })}
      >
        {/* Left - Home */}
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={28} color={color} />
            ),
          }}
        />

        {/* Center - Community Chat */}
        <Tabs.Screen
          name="community-chat"
          options={{
            tabBarIcon: ({ color }) => (
              // <View style={styles.centerTab}>
              <Ionicons name="chatbubbles-outline" size={28} color={color} />
              // </View>
            ),
            title: "Community Chat",
          }}
        />

        {/* Apartments Screen */}
        <Tabs.Screen
          name="apartments"
          options={{
            title: "My Apartments",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business-outline" color={color} size={size} />
            ),
            headerShown: true,
          }}
        />

        {/* Hidden screen, but part of the layout */}
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
            title: "Complaint Tickets System",
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
            title: "Update Society Details",
            href: null,
          }}
        />

        {/* Right - Invite Members */}
        <Tabs.Screen
          name="invite"
          options={{
            title: "Invite Members",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-add-outline" color={color} size={size} />
            ),
            headerShown: true,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  menuContainer: {
    position: "absolute",
    top: 50,
    right: 16,
    width: 240,
    borderWidth: 1,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
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
    fontSize: 16,
  },
  separator: {
    height: 1,
    width: "100%",
  },
  centerTab: {
    backgroundColor: "#4a90e2",
    padding: 12,
    borderRadius: 50,
    marginBottom: 25,
    elevation: 5,
  },
});

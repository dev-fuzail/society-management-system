import { Tabs, router } from 'expo-router';
import React, { useState } from 'react';
import {
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  View,
  Text,
  Pressable,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const handleMenuNavigate = (path: string) => {
    setIsMenuVisible(false);
    router.push(path);
  };

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
              onPress={() => handleMenuNavigate('/profile')}
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
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuNavigate('/forgot-password')}
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

      <Tabs
        screenOptions={({ route }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.background,
            elevation: 0,
            shadowOpacity: 0,
          },
          title:
            route.name === 'index'
              ? 'Dashboard'
              : route.name.charAt(0).toUpperCase() + route.name.slice(1),
          headerTitleAlign: 'left',
          headerLeft: () => (
            <Image
              source={require('@/assets/images/icon.png')}
              style={{ width: 32, height: 32, marginHorizontal: 16 }}
              resizeMode="contain"
            />
          ),
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => setIsMenuVisible(true)} // Open the modal
            >
              <Ionicons
                name="person-circle-outline"
                size={28}
                color={theme.text}
              />
            </TouchableOpacity>
          ),
          tabBarActiveTintColor: theme.tint,
          tabBarButton: HapticTab,
        })}
      >
        {/* Your existing tabs */}
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color }) => (
              <IconSymbol name="house.fill" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            tabBarIcon: ({ color }) => (
              <IconSymbol name="paperplane.fill" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reels"
          options={{
            tabBarIcon: ({ color }) => (
              <IconSymbol name="play.rectangle.fill" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            tabBarIcon: ({ color }) => (
              <IconSymbol name="bag.fill" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ color }) => (
              <IconSymbol name="person.fill" size={28} color={color} />
            ),
          }}
        />
        {/* The new invite tab you added */}
        <Tabs.Screen
          name="invite"
          options={{
            title: 'Invite Members',
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
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  menuContainer: {
    position: 'absolute',
    top: 50, // Adjust as needed, approx height of header
    right: 16,
    width: 240,
    borderWidth: 1,
    borderRadius: 8,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    width: '100%',
  },
});
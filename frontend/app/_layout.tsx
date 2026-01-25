// // RootLayout.tsx
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StatusBar } from 'expo-status-bar';
import CustomSplash from "../components/SplashScreen";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isSplashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('token');
      setIsLoggedIn(!!token);
    };
    checkToken();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setSplashVisible(false);
      await SplashScreen.hideAsync();
    }, 2300);

    return () => clearTimeout(timer);
  }, []);

  if (isSplashVisible) {
    return <CustomSplash />;
  }

  if (isLoggedIn === null) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          // 🔓 PUBLIC ROUTES (Bina Login Ke)
          <>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="join" />
            
            {/* ✅ YE DONO ZAROORI HAIN */}
            <Stack.Screen name="forgot-password" options={{ title: "Forgot Password" }} />
            <Stack.Screen name="reset-password" options={{ title: "Reset Password" }} />
          </>
        ) : (
          // 🔒 PROTECTED ROUTES (Login Ke Baad)
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="society-update" />
          </>
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
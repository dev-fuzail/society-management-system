import { Stack, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomSplash from "../components/SplashScreen";
import * as SplashScreen from "expo-splash-screen";
import { Platform } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isSplashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      const token = Platform.OS === 'web'
        ? localStorage.getItem('authToken')
        : await AsyncStorage.getItem('authToken');
      setIsLoggedIn(!!token);
    };
    checkToken();
  }, [pathname]);

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
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {!isLoggedIn ? [
            // 🔓 PUBLIC ROUTES
            <Stack.Screen key="login" name="login" />,
            <Stack.Screen key="register" name="register" />,
            <Stack.Screen key="join" name="join" />,
            <Stack.Screen key="forgot-password" name="forgot-password" options={{ title: "Forgot Password" }} />,
            <Stack.Screen key="reset-password" name="reset-password" options={{ title: "Reset Password" }} />,
          ] : [
            // 🔒 PROTECTED ROUTES
            <Stack.Screen key="(tabs)" name="(tabs)" />,
          ]}
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
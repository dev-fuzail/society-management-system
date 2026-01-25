import { Stack } from "expo-router";
import React from "react";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.tint,
        headerTitleStyle: { fontWeight: 'bold' },
        // Custom styling for all auth screens
      }}
    >
      <Stack.Screen name="login" options={{ title: "Login", headerShown: false }} />
      <Stack.Screen name="register" options={{ title: "Register Society" }} />
      <Stack.Screen name="join" options={{ title: "Join Society" }} />
      <Stack.Screen name="forgot-password" options={{ title: "Forgot Password" }} />
      {/* <Stack.Screen name="reset-password" options={{ title: "Reset Password" }} /> */}
    </Stack>
  );
}
import { Stack } from "expo-router";
import React from "react";
import { View, StyleSheet, TouchableOpacity, Text, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SocietyUpdateLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.background,
        //   elevation: 0,
        //   shadowOpacity: 0,
        },
        headerTitleAlign: "left",
        headerLeft: () => (
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: 32, height: 32, marginHorizontal: 16 }}
            resizeMode="contain"
          />
        ),
        headerRight: () => (
          <TouchableOpacity style={{ marginRight: 16 }}>
            <Ionicons name="person-circle-outline" size={28} color={theme.text} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Profile Management",
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({});

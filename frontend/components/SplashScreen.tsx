import React, { useEffect } from "react";
import { View, Image, Text, StyleSheet, Animated } from "react-native";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function CustomSplash() {
    const fadeAnim = new Animated.Value(0);

    useEffect(() => {
        // Fade in the content
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        // Wait for 2 seconds, then hide splash and move to main screen
        const timer = setTimeout(async () => {
            await SplashScreen.hideAsync();
            // Example: navigate to home after splash
            // navigation.replace("(tabs)" or "home");
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
                <Image
                    source={require("@/assets/images/icon.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>LIVING SYNC</Text>
                <Text style={styles.tagline}>Premium Society Management</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#FFD671",
        letterSpacing: 4,
    },
    tagline: {
        fontSize: 14,
        color: "#bdbdbd",
        marginTop: 8,
        letterSpacing: 1.2,
    },
});

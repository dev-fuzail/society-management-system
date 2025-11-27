import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveAuthData = async (token: string, userData: any) => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
    } else {
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
    }
  } catch (err) {
    console.error('Failed to save auth data', err);
  }
};

export const getAuthData = async () => {
  try {
    if (Platform.OS === "web") {
      const token = localStorage.getItem("authToken");
      const userData = localStorage.getItem("userData");
      return {
        token,
        userData: userData ? JSON.parse(userData) : null,
      };
    } else {
      const token = await AsyncStorage.getItem("authToken");
      const userDataStr = await AsyncStorage.getItem("userData");
      return {
        token,
        userData: userDataStr ? JSON.parse(userDataStr) : null,
      };
    }
  } catch (err) {
    console.error("Failed to get auth data", err);
    return { token: null, userData: null };
  }
};
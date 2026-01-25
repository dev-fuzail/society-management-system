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

// hooks/helperHooks.ts

export const clearAuthData = async () => {
  try {
    if (Platform.OS === 'web') {
      localStorage.clear(); // Web ke liye sab saaf
    } else {
      // Mobile ke liye: Specific keys delete karein taake ghalti ki gunjaish na ho
      const keys = ['authToken', 'userData', 'token']; // 'token' bhi daal diya safety ke liye
      await AsyncStorage.multiRemove(keys);
    }
    console.log('Auth Data Cleared Successfully');
  } catch (err) {
    console.error('Failed to clear auth data', err);
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

export const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
};
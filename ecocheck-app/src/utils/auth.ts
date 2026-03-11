import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'token';

export const storeToken = async (token: string) => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error('Error storing token:', e);
  }
};

export const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return token || null;
  } catch (e) {
    console.error('Error getting token:', e);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error('Error removing token:', e);
  }
};

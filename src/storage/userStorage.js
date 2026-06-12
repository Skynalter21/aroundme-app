import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = "@aroundme:user";

export async function getStoredUser() {
  const savedUser = await AsyncStorage.getItem(USER_KEY);

  if (!savedUser) {
    return null;
  }

  return JSON.parse(savedUser);
}

export async function saveStoredUser(user) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function removeStoredUser() {
  await AsyncStorage.removeItem(USER_KEY);
}
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

const DEV_API_URL = `http://${DEV_HOST}:4000/api`;
const DEV_SOCKET_URL = `http://${DEV_HOST}:4000`;
const PROD_API_URL = 'https://task-board-732m.onrender.com/api';
const PROD_SOCKET_URL = 'https://task-board-732m.onrender.com';

const extra = Constants.expoConfig?.extra;

const ENV = {
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    (extra?.apiUrl && extra.apiUrl[__DEV__ ? 'development' : 'production']) ||
    (__DEV__ ? DEV_API_URL : PROD_API_URL),
  SOCKET_URL:
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    (extra?.socketUrl && extra.socketUrl[__DEV__ ? 'development' : 'production']) ||
    (__DEV__ ? DEV_SOCKET_URL : PROD_SOCKET_URL),
};

export default ENV;

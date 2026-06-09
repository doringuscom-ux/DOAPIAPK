import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

const DEFAULT_API = '';

export const ApiContext = createContext({
  apiUrl: '',
  apiList: [],
  setActiveApi: (url) => {},
  addApi: (name, url) => {},
  removeApi: (url) => {}
});

export const useApi = () => useContext(ApiContext);

async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'e620cd27-4535-4b33-8b0e-368fc7f633ba',
    })).data;
  }
  return token;
}

export const ApiProvider = ({ children }) => {
  const [apiUrl, setApiUrl] = useState('');
  const [apiList, setApiList] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Whenever the active API changes, attempt to register the push token with the new backend
    if (apiUrl) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          fetch(`${apiUrl}/api/admin/push-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          }).catch(err => console.log('Failed to save push token to new backend:', err.message));
        }
      });
    }
  }, [apiUrl]);

  const loadData = async () => {
    try {
      const storedUrl = await AsyncStorage.getItem('@active_api');
      const storedList = await AsyncStorage.getItem('@api_list');
      if (storedUrl) setApiUrl(storedUrl);
      if (storedList) setApiList(JSON.parse(storedList));
    } catch (e) {
      console.error(e);
    }
  };

  const setActiveApi = async (url) => {
    setApiUrl(url);
    await AsyncStorage.setItem('@active_api', url);
  };

  const addApi = async (name, url) => {
    const formattedUrl = url.replace(/\/+$/, ''); // remove trailing slash
    const newList = [...apiList, { name, url: formattedUrl }];
    setApiList(newList);
    await AsyncStorage.setItem('@api_list', JSON.stringify(newList));
    if (newList.length === 1) setActiveApi(formattedUrl);
  };

  const removeApi = async (url) => {
    const newList = apiList.filter(api => api.url !== url);
    setApiList(newList);
    await AsyncStorage.setItem('@api_list', JSON.stringify(newList));
    if (apiUrl === url) {
      if (newList.length > 0) setActiveApi(newList[0].url);
      else setActiveApi('');
    }
  };

  return (
    <ApiContext.Provider value={{ apiUrl, apiList, setActiveApi, addApi, removeApi }}>
      {children}
    </ApiContext.Provider>
  );
};

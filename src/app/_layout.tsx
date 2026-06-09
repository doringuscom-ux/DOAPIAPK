import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ 
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#000' }
      }}>
        <Stack.Screen name="index" options={{ title: 'Digital ORRA Dashboard' }} />
        <Stack.Screen name="chat" options={{ title: 'Chat' }} />
      </Stack>
    </>
  );
}

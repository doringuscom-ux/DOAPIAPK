import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

const API_BASE = 'https://digital-orra-api.vercel.app';

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sessions`);
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4ade80" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.phone}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatCard} 
            onPress={() => router.push({ pathname: '/chat', params: { phone: item.phone } })}
          >
            <View style={styles.chatHeader}>
              <Text style={styles.phone}>{item.phone}</Text>
              <View style={[styles.badge, { backgroundColor: item.aiEnabled ? (item.pausedUntil && new Date(item.pausedUntil) > new Date() ? '#eab308' : '#4ade80') : '#ef4444' }]}>
                <Text style={styles.badgeText}>
                  {!item.aiEnabled ? 'AI Disabled' : (item.pausedUntil && new Date(item.pausedUntil) > new Date() ? 'Paused' : 'Active')}
                </Text>
              </View>
            </View>
            <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage || 'No messages yet'}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  container: { flex: 1, backgroundColor: '#000', padding: 10 },
  chatCard: { backgroundColor: '#1a1a1a', padding: 15, borderRadius: 10, marginBottom: 10 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  phone: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  lastMessage: { color: '#9ca3af', fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#000', fontSize: 10, fontWeight: 'bold' }
});

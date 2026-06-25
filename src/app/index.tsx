import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, Stack, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApi } from '../context/ApiContext';

export default function Dashboard() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchError, setFetchError] = useState('');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { apiUrl, apiPassword, setActiveApi, setApiPassword, isInitialized } = useApi();

  const fetchSessions = async () => {
    if (!apiUrl) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/sessions`, {
        headers: { 'x-api-password': apiPassword }
      });
      if (res.status === 401) {
        Alert.alert('Unauthorized', 'Invalid API Password. Please update it in Settings.');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
      } else {
        setSessions([]);
      }
      setFetchError('');
    } catch (err: any) {
      console.error(err);
      setFetchError(err.message || 'Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!apiUrl) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  if (!isInitialized || loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4ade80" /></View>;
  }

  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const filteredSessions = safeSessions.filter(s => 
    (s.phone && String(s.phone).includes(searchQuery)) || 
    (s.name && String(s.name).toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.lastMessage && String(s.lastMessage).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Chats',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => router.push('/broadcast' as any)} style={{ marginRight: 20 }}>
                <Text style={{color: '#eab308', fontWeight: 'bold'}}>📢 Broadcast</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setActiveApi('');
                setApiPassword('');
              }}>
                <Text style={{color: '#ef4444', fontWeight: 'bold', marginRight: 15}}>🚪 Logout</Text>
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      
      {!apiUrl ? (
        <Redirect href="/login" />
      ) : (
        <>
          <TextInput
        style={styles.searchInput}
        placeholder="Search phone or message..."
        placeholderTextColor="#6b7280"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      {fetchError ? (
        <View style={{padding: 20, alignItems: 'center'}}>
          <Text style={{color: '#ef4444', textAlign: 'center'}}>{fetchError}</Text>
          <Text style={{color: '#9ca3af', textAlign: 'center', marginTop: 10, fontSize: 12}}>Check if your API URL is correct.</Text>
        </View>
      ) : null}

      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item.phone}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatCard} 
            onPress={() => router.push({ pathname: '/chat', params: { phone: item.phone } })}
          >
            <View style={styles.chatHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={styles.phone}>{item.name ? item.name : item.phone}</Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.badge, { backgroundColor: item.aiEnabled ? (item.pausedUntil && new Date(item.pausedUntil) > new Date() ? '#eab308' : '#4ade80') : '#ef4444' }]}>
                <Text style={styles.badgeText}>
                  {!item.aiEnabled ? 'AI Disabled' : (item.pausedUntil && new Date(item.pausedUntil) > new Date() ? 'Paused' : 'Active')}
                </Text>
              </View>
            </View>
            {item.name ? <Text style={styles.subPhone}>{item.phone}</Text> : null}
            <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage || 'No messages yet'}</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={[styles.fab, { bottom: Math.max(20, insets.bottom + 10) }]} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start New Chat</Text>
            <Text style={styles.modalSub}>Enter phone number with country code</Text>
            
            <TextInput
              style={styles.input}
              placeholder="e.g. 919876543210"
              placeholderTextColor="#6b7280"
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.btnStart} 
                onPress={() => {
                  const cleaned = newPhone.replace(/[^0-9]/g, '');
                  if (cleaned) {
                    setModalVisible(false);
                    setNewPhone('');
                    router.push({ pathname: '/chat', params: { phone: cleaned } });
                  }
                }}
              >
                <Text style={styles.btnStartText}>Start Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
        </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  container: { flex: 1, backgroundColor: '#000', padding: 10 },
  searchInput: { backgroundColor: '#1f2937', color: '#fff', padding: 12, borderRadius: 10, fontSize: 14, marginBottom: 15 },
  chatCard: { backgroundColor: '#1a1a1a', padding: 15, borderRadius: 10, marginBottom: 10 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  phone: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  subPhone: { color: '#6b7280', fontSize: 12, marginBottom: 5 },
  unreadBadge: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  lastMessage: { color: '#9ca3af', fontSize: 14, marginTop: 5 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4ade80', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { fontSize: 30, color: '#000', fontWeight: 'bold', marginTop: -2 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { width: '85%', backgroundColor: '#1f2937', padding: 20, borderRadius: 15 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  modalSub: { color: '#9ca3af', fontSize: 14, marginBottom: 15 },
  input: { backgroundColor: '#111827', color: '#fff', padding: 15, borderRadius: 10, fontSize: 16, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btnCancel: { padding: 12, borderRadius: 8, backgroundColor: '#374151' },
  btnCancelText: { color: '#fff', fontWeight: 'bold' },
  btnStart: { padding: 12, borderRadius: 8, backgroundColor: '#4ade80' },
  btnStartText: { color: '#000', fontWeight: 'bold' }
});

import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';

const API_BASE = 'https://digital-orra-api.vercel.app';

export default function ChatView() {
  const { phone } = useLocalSearchParams();
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef(null);

  const fetchChat = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chats/${phone}`);
      const data = await res.json();
      if (!data.error) setSession(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => clearInterval(interval);
  }, [phone]);

  const toggleAI = async () => {
    await fetch(`${API_BASE}/api/toggle-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, aiEnabled: !session.aiEnabled })
    });
    fetchChat();
  };

  const togglePause = async () => {
    const isPaused = session.pausedUntil && new Date(session.pausedUntil) > new Date();
    const endpoint = isPaused ? '/api/resume' : '/api/pause';
    await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone })
    });
    fetchChat();
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await fetch(`${API_BASE}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, message })
      });
      setMessage('');
      fetchChat();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (!session) return <View style={styles.center}><ActivityIndicator color="#4ade80" /></View>;

  const isPaused = session.pausedUntil && new Date(session.pausedUntil) > new Date();

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: Array.isArray(phone) ? phone[0] : phone }} />
      
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.btn, session.aiEnabled ? styles.btnActive : styles.btnDanger]} onPress={toggleAI}>
          <Text style={styles.btnText}>{session.aiEnabled ? 'AI is ON' : 'AI is OFF'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, isPaused ? styles.btnWarning : styles.btnSecondary]} onPress={togglePause}>
          <Text style={styles.btnText}>{isPaused ? 'Resume AI' : 'Pause 5m'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef} 
        style={styles.chatArea} 
        contentContainerStyle={{ padding: 10 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {session.history && session.history.filter(m => m.role !== 'system').map((msg, i) => (
          <View key={i} style={[styles.bubble, msg.role === 'assistant' ? styles.bubbleBot : styles.bubbleUser]}>
            <Text style={styles.msgText}>{msg.content}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput 
          style={styles.input} 
          value={message} 
          onChangeText={setMessage} 
          placeholder="Type a message..." 
          placeholderTextColor="#666" 
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={sending}>
          <Text style={styles.sendBtnText}>{sending ? '...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  container: { flex: 1, backgroundColor: '#000' },
  controls: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  btn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  btnActive: { backgroundColor: '#22c55e' },
  btnDanger: { backgroundColor: '#ef4444' },
  btnWarning: { backgroundColor: '#eab308' },
  btnSecondary: { backgroundColor: '#374151' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  chatArea: { flex: 1 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 12, marginBottom: 10 },
  bubbleUser: { backgroundColor: '#1f2937', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  bubbleBot: { backgroundColor: '#2563eb', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  msgText: { color: '#fff', fontSize: 15 },
  inputArea: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#333', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#1a1a1a', color: '#fff', padding: 12, borderRadius: 20, marginRight: 10 },
  sendBtn: { backgroundColor: '#4ade80', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  sendBtnText: { color: '#000', fontWeight: 'bold' }
});

import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Keyboard } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { EmojiKeyboard } from 'rn-emoji-keyboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApi } from '../context/ApiContext';

export default function ChatView() {
  const { phone } = useLocalSearchParams();
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollViewRef = useRef(null);
  const { apiUrl } = useApi();
  const insets = useSafeAreaInsets();

  const fetchChat = async () => {
    if (!apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/api/chats/${phone}`);
      const data = await res.json();
      if (!data.error) {
        setSession(data);
      } else {
        // Fallback for new chats that don't exist in DB yet
        setSession({ phone, aiEnabled: true, pausedUntil: null, history: [] });
      }
    } catch (err) {
      console.error(err);
      setSession({ phone, aiEnabled: true, pausedUntil: null, history: [] });
    }
  };

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => clearInterval(interval);
  }, [phone, apiUrl]);

  const toggleAI = async () => {
    if (!apiUrl) return;
    try {
      await fetch(`${apiUrl}/api/sessions/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, aiEnabled: !session.aiEnabled })
      });
      fetchChat();
    } catch (err) {
      console.error(err);
    }
  };

  const togglePause = async () => {
    if (!apiUrl) return;
    try {
      const isPaused = session.pausedUntil && new Date(session.pausedUntil) > new Date();
      const endpoint = isPaused ? '/api/sessions/resume' : '/api/sessions/pause';
      await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone })
      });
      fetchChat();
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !apiUrl) return;
    setSending(true);
    
    const tempMsg = { role: 'user', content: message, timestamp: new Date() };
    setSession(prev => ({ ...prev, history: [...prev.history, tempMsg] }));
    setMessage('');

    try {
      await fetch(`${apiUrl}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, message: tempMsg.content })
      });
      fetchChat();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (!session) return <View style={styles.center}><ActivityIndicator color="#4ade80" /></View>;

  const isPaused = session.pausedUntil && new Date(session.pausedUntil) > new Date();

  const handleRename = async () => {
    if (!apiUrl) return;
    try {
      await fetch(`${apiUrl}/api/sessions/name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, name: newName })
      });
      setRenameModal(false);
      fetchChat();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}>
      <Stack.Screen 
        options={{ 
          title: session.name ? session.name : (Array.isArray(phone) ? phone[0] : phone),
          headerRight: () => (
            <TouchableOpacity onPress={() => { setNewName(session.name || ''); setRenameModal(true); }}>
              <Text style={{color: '#4ade80', fontWeight: 'bold', marginRight: 15}}>Rename</Text>
            </TouchableOpacity>
          )
        }} 
      />
      
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

      <View style={[styles.inputArea, { paddingBottom: Math.max(10, insets.bottom) }]}>
        <TouchableOpacity 
          style={styles.emojiBtn} 
          onPress={() => {
            if (showEmojiPicker) {
              setShowEmojiPicker(false);
            } else {
              Keyboard.dismiss();
              setShowEmojiPicker(true);
            }
          }}
        >
          <Text style={styles.emojiBtnText}>😊</Text>
        </TouchableOpacity>
        <TextInput 
          style={styles.input} 
          value={message} 
          onChangeText={setMessage} 
          placeholder="Type a message..." 
          placeholderTextColor="#666" 
          onFocus={() => setShowEmojiPicker(false)}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={sending}>
          <Text style={styles.sendBtnText}>{sending ? '...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>

      {showEmojiPicker && (
        <View style={{ height: 350, width: '100%', backgroundColor: '#1f2937' }}>
          <EmojiKeyboard
            onEmojiSelected={(emoji) => setMessage(prev => prev + emoji.emoji)}
            theme={{ container: '#1f2937', header: '#ffffff' }}
            hideHeader={false}
          />
        </View>
      )}

      <Modal animationType="slide" transparent={true} visible={renameModal} onRequestClose={() => setRenameModal(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ width: '85%', backgroundColor: '#1f2937', padding: 20, borderRadius: 15 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>Rename Contact</Text>
            <TextInput
              style={{ backgroundColor: '#111827', color: '#fff', padding: 15, borderRadius: 10, fontSize: 16, marginBottom: 20 }}
              placeholder="Enter name"
              placeholderTextColor="#6b7280"
              value={newName}
              onChangeText={setNewName}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity style={{ padding: 12, borderRadius: 8, backgroundColor: '#374151' }} onPress={() => setRenameModal(false)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderRadius: 8, backgroundColor: '#4ade80' }} onPress={handleRename}>
                <Text style={{ color: '#000', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  emojiBtn: { padding: 10, marginRight: 5 },
  emojiBtnText: { fontSize: 24 },
  input: { flex: 1, backgroundColor: '#111827', color: '#fff', padding: 12, borderRadius: 20, marginRight: 10 },
  sendBtn: { backgroundColor: '#4ade80', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  sendBtnText: { color: '#000', fontWeight: 'bold' }
});

import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { EmojiKeyboard } from 'rn-emoji-keyboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApi } from '../context/ApiContext';

export default function ChatView() {
  const { phone } = useLocalSearchParams();
  const [session, setSession] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const scrollViewRef = useRef<any>(null);
  const router = useRouter();
  const { apiUrl, apiPassword } = useApi();
  const insets = useSafeAreaInsets();

  const fetchChat = async () => {
    if (!apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/api/chats/${phone}`, {
        headers: { 'x-api-password': apiPassword }
      });
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
      await fetch(`${apiUrl}/api/toggle-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-password': apiPassword },
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
      const endpoint = isPaused ? '/api/resume' : '/api/pause';
      await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-password': apiPassword },
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
    setSession((prev: any) => ({ ...prev, history: [...prev.history, tempMsg] }));
    setMessage('');

    try {
      await fetch(`${apiUrl}/api/chats/${phone}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-password': apiPassword },
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
        headers: { 'Content-Type': 'application/json', 'x-api-password': apiPassword },
        body: JSON.stringify({ to: phone, name: newName })
      });
      setRenameModal(false);
      fetchChat();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteChat = () => {
    Alert.alert('Delete Chat', 'Are you sure you want to delete the entire chat history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await fetch(`${apiUrl}/api/chats/${phone}`, {
              method: 'DELETE',
              headers: { 'x-api-password': apiPassword }
            });
            router.replace('/');
          } catch (err) {
            console.error(err);
          }
        } 
      }
    ]);
  };

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
      if (newSet.size === 0) setIsSelectionMode(false);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleLongPress = (index: number) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIndices(new Set([index]));
    }
  };

  const handlePress = (index: number) => {
    if (isSelectionMode) {
      toggleSelection(index);
    }
  };

  const deleteSelected = async () => {
    if (selectedIndices.size === 0) return;
    Alert.alert('Delete Messages', `Delete ${selectedIndices.size} selected message(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await fetch(`${apiUrl}/api/chats/${phone}/messages/bulk-delete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-password': apiPassword },
              body: JSON.stringify({ indices: Array.from(selectedIndices) })
            });
            setIsSelectionMode(false);
            setSelectedIndices(new Set());
            fetchChat();
          } catch (err) {
            console.error(err);
          }
        }
      }
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}>
      <Stack.Screen 
        options={{ 
          title: session.name ? session.name : (Array.isArray(phone) ? phone[0] : phone),
          headerRight: () => (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 15}}>
              <TouchableOpacity onPress={() => { setNewName(session.name || ''); setRenameModal(true); }}>
                <Text style={{color: '#4ade80', fontWeight: 'bold'}}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deleteChat} style={{marginRight: 15}}>
                <Text style={{color: '#ef4444', fontSize: 18}}>🗑️</Text>
              </TouchableOpacity>
            </View>
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
        {session.history && session.history.filter((m: any) => m.role !== 'system').map((msg: any, i: number) => {
          const timeString = msg.timestamp ? new Date(msg.timestamp).toLocaleDateString() + ' ' + new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          
          let statusIcon = null;
          if (msg.role === 'assistant') {
            switch (msg.status) {
              case 'sent': statusIcon = <Text style={{color: '#9ca3af', fontSize: 10, marginLeft: 5}}>✓</Text>; break;
              case 'delivered': statusIcon = <Text style={{color: '#9ca3af', fontSize: 10, marginLeft: 5}}>✓✓</Text>; break;
              case 'read': statusIcon = <Text style={{color: '#3b82f6', fontSize: 10, marginLeft: 5}}>✓✓</Text>; break;
              case 'failed': statusIcon = <Text style={{color: '#ef4444', fontSize: 10, marginLeft: 5}}>❌</Text>; break;
              default: statusIcon = <Text style={{color: '#6b7280', fontSize: 10, marginLeft: 5}}>⌚</Text>; break;
            }
          }

          return (
            <TouchableOpacity 
              key={i} 
              onLongPress={() => handleLongPress(i)} 
              onPress={() => handlePress(i)}
              activeOpacity={0.8}
              style={{
                flexDirection: msg.role === 'assistant' ? 'row-reverse' : 'row',
                alignItems: 'center',
                backgroundColor: selectedIndices.has(i) ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
                marginVertical: 2,
                paddingVertical: 2,
                borderRadius: 8,
              }}
            >
              {isSelectionMode && (
                <View style={{width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#4ade80', marginHorizontal: 10, alignItems: 'center', justifyContent: 'center'}}>
                  {selectedIndices.has(i) && <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: '#4ade80'}} />}
                </View>
              )}
              <View style={[styles.bubble, msg.role === 'assistant' ? styles.bubbleBot : styles.bubbleUser, { marginHorizontal: isSelectionMode ? 0 : 10 }]}>
                <Text style={styles.msgText}>{msg.content}</Text>
                {timeString ? (
                  <View style={{flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 2}}>
                    <Text style={styles.timeText}>{timeString}</Text>
                    {statusIcon}
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 10, paddingBottom: 5, flexDirection: 'row' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={{ backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, marginRight: 8 }}
            onPress={() => setMessage('Thank you for your message. We will get back to you shortly!')}
          >
            <Text style={{ color: '#d1d5db', fontSize: 13 }}>Auto Reply: "Thank you..."</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {isSelectionMode && (
        <View style={{flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#1f2937', borderTopWidth: 1, borderTopColor: '#374151'}}>
          <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>{selectedIndices.size} Selected</Text>
          <View style={{flexDirection: 'row', gap: 20}}>
            <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedIndices(new Set()); }}>
              <Text style={{color: '#9ca3af', fontSize: 16}}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={deleteSelected}>
              <Text style={{color: '#ef4444', fontSize: 16, fontWeight: 'bold'}}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
  timeText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, alignSelf: 'flex-end', marginTop: 4 },
  inputArea: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#333', alignItems: 'center' },
  emojiBtn: { padding: 10, marginRight: 5 },
  emojiBtnText: { fontSize: 24 },
  input: { flex: 1, backgroundColor: '#111827', color: '#fff', padding: 12, borderRadius: 20, marginRight: 10 },
  sendBtn: { backgroundColor: '#4ade80', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  sendBtnText: { color: '#000', fontWeight: 'bold' }
});

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, FlatList, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../context/ApiContext';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { apiUrl, apiList, addApi, setActiveApi, setApiPassword } = useApi();

  const [inputUrl, setInputUrl] = useState('https://');
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Change Password state
  const [isChangePasswordMode, setIsChangePasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleLogin = async () => {
    if (!inputUrl || inputUrl === 'https://') return Alert.alert('Error', 'Please enter a valid Backend URL.');
    if (!inputPassword) return Alert.alert('Error', 'Please enter your password.');
    
    setLoading(true);
    let cleaned = inputUrl.trim().replace(/\/+$/, '');
    // Strip any malformed or double http/https prefixes completely
    cleaned = cleaned.replace(/^https?:\/?\/?(https?:\/?\/?)?/i, '');
    const formattedUrl = 'https://' + cleaned;
    
    try {
      // Test the connection by hitting /api/sessions
      const res = await fetch(`${formattedUrl}/api/sessions`, {
        headers: { 'x-api-password': inputPassword }
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error('Incorrect Password.');
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      
      // Success
      await addApi('Backend Server', formattedUrl);
      await setApiPassword(inputPassword);
      await setActiveApi(formattedUrl);
      
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Connection Failed', err.message || 'Could not connect to the backend. Check URL and Password.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!inputUrl || inputUrl === 'https://') return Alert.alert('Error', 'Please enter your Backend URL.');
    if (!inputPassword) return Alert.alert('Error', 'Please enter your current (old) password.');
    if (!newPassword) return Alert.alert('Error', 'Please enter a new password.');

    setLoading(true);
    let cleaned = inputUrl.trim().replace(/\/+$/, '');
    cleaned = cleaned.replace(/^https?:\/?\/?(https?:\/?\/?)?/i, '');
    const formattedUrl = 'https://' + cleaned;

    try {
      const res = await fetch(`${formattedUrl}/api/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-password': inputPassword
        },
        body: JSON.stringify({ newPassword: newPassword })
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error('Current (old) password is incorrect.');
        throw new Error('Failed to change password on server');
      }

      Alert.alert('Success', 'Backend password changed successfully! You can now login with your new password.');
      setIsChangePasswordMode(false);
      setInputPassword(newPassword);
      setNewPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSavedAccount = async (url: string) => {
    setInputUrl(url);
    setIsChangePasswordMode(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
        
        <View style={styles.header}>
          <Image source={require('../../assets/images/Logo-square.png')} style={styles.logo} />
          <Text style={styles.title}>Digital ORRA</Text>
          <Text style={styles.subtitle}>{isChangePasswordMode ? 'Change Backend Password' : 'Login to your backend'}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Backend URL</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="link" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="https://your-api-url.vercel.app"
              placeholderTextColor="#6b7280"
              value={inputUrl}
              onChangeText={setInputUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <Text style={styles.label}>{isChangePasswordMode ? 'Current (Old) Password' : 'Password'}</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter password..."
              placeholderTextColor="#6b7280"
              value={inputPassword}
              onChangeText={setInputPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {isChangePasswordMode && (
            <>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="key" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password..."
                  placeholderTextColor="#6b7280"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </>
          )}

          {isChangePasswordMode ? (
            <TouchableOpacity style={styles.btnPrimary} onPress={handleChangePassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Update Password</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Login</Text>}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.linkBtn} onPress={() => setIsChangePasswordMode(!isChangePasswordMode)}>
            <Text style={styles.linkText}>
              {isChangePasswordMode ? 'Back to Login' : 'Need to change backend password?'}
            </Text>
          </TouchableOpacity>
        </View>

        {!isChangePasswordMode && apiList.length > 0 && (
          <View style={styles.savedAccountsSection}>
            <Text style={styles.savedAccountsTitle}>Saved Accounts</Text>
            {apiList.map((item: any) => (
              <TouchableOpacity key={item.url} style={styles.savedAccountCard} onPress={() => handleSelectSavedAccount(item.url)}>
                <View style={styles.savedAccountIcon}>
                  <Ionicons name="server" size={24} color="#4ade80" />
                </View>
                <View style={styles.savedAccountInfo}>
                  <Text style={styles.savedAccountUrl} numberOfLines={1}>{item.url}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  form: {
    backgroundColor: '#111827',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  label: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  inputIcon: {
    padding: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
  },
  eyeBtn: {
    padding: 12,
  },
  btnPrimary: {
    backgroundColor: '#4ade80',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  btnPrimaryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '600',
  },
  savedAccountsSection: {
    marginTop: 32,
    flex: 1,
  },
  savedAccountsTitle: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  savedAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  savedAccountIcon: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginRight: 16,
  },
  savedAccountInfo: {
    flex: 1,
  },
  savedAccountUrl: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  }
});

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, FlatList, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApi } from '../context/ApiContext';

export default function Broadcast() {
  const { apiUrl, apiPassword } = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [headerImage, setHeaderImage] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [bodyVars, setBodyVars] = useState<string[]>([]);
  const [numbersInput, setNumbersInput] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleSelectTemplate = (item: any) => {
    setSelectedTemplate(item);
    setHeaderImage('');
    setSelectedImageUri(null);
    setImageBase64(null);
    const bodyComponent = item.components?.find((c: any) => c.type === 'BODY');
    if (bodyComponent && bodyComponent.text) {
      const matches = bodyComponent.text.match(/\{\{\d+\}\}/g);
      if (matches) {
        // Find unique matches or highest number to be safe? Simple count is enough usually if they are {{1}}, {{2}} in order.
        // Actually, matching unique variables is safer, but matches.length works if they don't repeat.
        // To be safe, we just use the count of matches. If {{1}} repeats, Meta API wants parameter for each occurrence?
        // Wait, Meta API requires parameters in the exact order they appear in the text. So if it appears 3 times, pass 3 parameters.
        setBodyVars(new Array(matches.length).fill(''));
      } else {
        setBodyVars([]);
      }
    } else {
      setBodyVars([]);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setSelectedImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  useEffect(() => {
    if (apiUrl) {
      fetchTemplates();
    }
  }, [apiUrl]);

  const fetchTemplates = async () => {
    if (!apiUrl) {
      setLoadingTemplates(false);
      return;
    }
    try {
      setLoadingTemplates(true);
      const res = await fetch(`${apiUrl}/api/templates`, {
        headers: { 'x-api-password': apiPassword }
      });
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTemplates(data);
      } else {
        setTemplates([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch templates:', err.message);
      if (Platform.OS === 'web') {
        window.alert('Failed to load templates. Check if your backend is running.');
      } else {
        Alert.alert('Error', 'Failed to load templates. Check if your backend is running.');
      }
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleFetchSessions = async () => {
    if (!apiUrl) {
      Alert.alert('Error', 'API URL is not configured.');
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/sessions`, {
        headers: { 'x-api-password': apiPassword }
      });
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      const allPhones = data.map((s: any) => s.phone).filter(Boolean);
      setNumbersInput(allPhones.join(', '));
      Alert.alert('Success', `Loaded ${allPhones.length} numbers from your active sessions.`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to fetch sessions.');
    }
  };

  const handleSendBroadcast = async () => {
    if (!selectedTemplate) {
      Alert.alert('Error', 'Please select a template first.');
      return;
    }
    
    if (selectedTemplate.components?.some((c: any) => c.type === 'HEADER' && c.format === 'IMAGE') && !selectedImageUri) {
      Alert.alert('Error', 'Please choose an image from gallery.');
      return;
    }
    
    if (bodyVars.some(v => !v.trim())) {
      Alert.alert('Error', 'Please fill all template variables.');
      return;
    }

    if (!numbersInput.trim()) {
      Alert.alert('Error', 'Please enter at least one phone number.');
      return;
    }

    const numbersArray = numbersInput.split(',').map(n => n.trim().replace(/[^0-9]/g, '')).filter(n => n.length > 5);
    
    if (numbersArray.length === 0) {
      Alert.alert('Error', 'No valid phone numbers found.');
      return;
    }

    Alert.alert(
      'Confirm Broadcast',
      `Are you sure you want to send "${selectedTemplate.name}" to ${numbersArray.length} numbers?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsBroadcasting(true);
              
              let finalImageUrl = headerImage;
              
              if (imageBase64) {
                const uploadRes = await fetch(`${apiUrl}/api/upload`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-api-password': apiPassword
                  },
                  body: JSON.stringify({ image: `data:image/jpeg;base64,${imageBase64}` }),
                });
                
                if (!uploadRes.ok) throw new Error('Image upload failed');
                const uploadData = await uploadRes.json();
                finalImageUrl = uploadData.url;
              }

              const apiComponents = [];
              if (finalImageUrl) {
                apiComponents.push({
                  type: 'header',
                  parameters: [{ type: 'image', image: { link: finalImageUrl.trim() } }]
                });
              }
              if (bodyVars.length > 0) {
                apiComponents.push({
                  type: 'body',
                  parameters: bodyVars.map(v => ({ type: 'text', text: v.trim() }))
                });
              }

              const payload = {
                templateName: selectedTemplate.name,
                languageCode: selectedTemplate.language || 'en',
                numbers: numbersArray,
                components: apiComponents
              };
              
              const res = await fetch(`${apiUrl}/api/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-password': apiPassword },
                body: JSON.stringify(payload)
              });
              
              if (!res.ok) throw new Error('Broadcast failed');
              
              Alert.alert('Success', `Broadcast started for ${numbersArray.length} numbers. It will run in the background.`);
              setNumbersInput('');
              setSelectedTemplate(null);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setIsBroadcasting(false);
            }
          } 
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ marginBottom: 15 }}>
        <Text style={styles.title}>New Broadcast</Text>
      </View>

      <TouchableOpacity 
        style={styles.statusBtn} 
        onPress={() => router.push('/broadcast-status')}
      >
        <Text style={styles.statusBtnText}>📊 View Broadcast History & Status</Text>
      </TouchableOpacity>
      
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select Approved Template</Text>
        {!apiUrl ? (
          <Text style={styles.errorText}>API URL is not configured. Go back and set it in settings.</Text>
        ) : loadingTemplates ? (
          <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#4ade80" />
            <Text style={{color: '#9ca3af', marginTop: 10}}>Loading templates from Meta...</Text>
          </View>
        ) : templates.length === 0 ? (
          <Text style={styles.errorText}>No approved templates found on Meta.</Text>
        ) : (
          <FlatList
            data={templates}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.templateCard,
                  selectedTemplate?.id === item.id && styles.templateCardSelected
                ]}
                onPress={() => handleSelectTemplate(item)}
              >
                <Text style={styles.templateName}>{item.name}</Text>
                <Text style={styles.templateLang}>{item.language}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {selectedTemplate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Template Preview</Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewText}>
              {selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text || 'No preview available'}
            </Text>
          </View>
          
          <View style={{ marginTop: 15 }}>
            {selectedTemplate.components?.some((c: any) => c.type === 'HEADER' && c.format === 'IMAGE') && (
              <View style={{marginBottom: 15}}>
                <Text style={styles.sectionTitle}>Image (Required)</Text>
                {selectedImageUri ? (
                  <View style={{alignItems: 'center', marginBottom: 10}}>
                    <Image source={{ uri: selectedImageUri }} style={{ width: 200, height: 200, borderRadius: 10 }} />
                    <TouchableOpacity onPress={() => setSelectedImageUri(null)} style={{marginTop: 10}}>
                      <Text style={{color: '#ef4444'}}>Remove Image</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.button} onPress={pickImage}>
                    <Text style={styles.buttonText}>Choose Image from Gallery</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {bodyVars.length > 0 && (
              <View style={{marginBottom: 15}}>
                <Text style={styles.sectionTitle}>Template Variables</Text>
                {bodyVars.map((v, i) => (
                  <TextInput 
                    key={i}
                    style={[styles.numbersInput, { minHeight: 50, marginBottom: 10 }]} 
                    placeholder={`Value for {{${i+1}}}`}
                    placeholderTextColor="#6b7280"
                    value={v}
                    onChangeText={(text) => {
                      const newVars = [...bodyVars];
                      newVars[i] = text;
                      setBodyVars(newVars);
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>2. Enter Numbers</Text>
          <TouchableOpacity onPress={handleFetchSessions}>
            <Text style={styles.linkText}>Load All Sessions</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.numbersInput}
          multiline
          placeholder="Enter comma-separated phone numbers (e.g. 919876543210, 919988776655)"
          placeholderTextColor="#6b7280"
          value={numbersInput}
          onChangeText={setNumbersInput}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.btnSend, (!selectedTemplate || isBroadcasting) && { opacity: 0.5 }]} 
          disabled={!selectedTemplate || isBroadcasting}
          onPress={handleSendBroadcast}
        >
          {isBroadcasting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.btnSendText}>Send Broadcast</Text>
          )}
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
    padding: 15,
  },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  statusBtn: { 
    backgroundColor: '#1f2937', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    borderRadius: 12, 
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
    elevation: 5,
  },
  statusBtnText: { color: '#4ade80', fontWeight: 'bold', fontSize: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  templateCard: {
    backgroundColor: '#111827',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    minWidth: 120,
    alignItems: 'center',
  },
  templateCardSelected: {
    borderColor: '#4ade80',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  templateName: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  templateLang: {
    color: '#9ca3af',
    fontSize: 12,
  },
  errorText: {
    color: '#ef4444',
    fontStyle: 'italic',
  },
  previewBox: {
    backgroundColor: '#1f2937',
    padding: 15,
    borderRadius: 8,
  },
  previewText: {
    color: '#d1d5db',
    fontSize: 14,
  },
  linkText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: 'bold',
  },
  numbersInput: {
    minHeight: 150,
    backgroundColor: '#111827',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    textAlignVertical: 'top',
    fontSize: 16,
  },
  footer: {
    paddingVertical: 10,
  },
  btnSend: {
    backgroundColor: '#4ade80',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSendText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#374151',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});

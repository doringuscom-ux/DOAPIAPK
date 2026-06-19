import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useApi } from '../context/ApiContext';

export default function Broadcast() {
  const { apiUrl } = useApi();
  const router = useRouter();
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [numbersInput, setNumbersInput] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    if (apiUrl) {
      fetchTemplates();
    }
  }, [apiUrl]);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await fetch(`${apiUrl}/api/templates`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTemplates(data);
      } else {
        setTemplates([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch templates:', err.message);
      Alert.alert('Error', 'Failed to load templates from Meta. Please check backend WABA_ID.');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleFetchSessions = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/sessions`);
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
              const payload = {
                templateName: selectedTemplate.name,
                languageCode: selectedTemplate.language || 'en',
                numbers: numbersArray
              };
              
              const res = await fetch(`${apiUrl}/api/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Stack.Screen options={{ title: 'Broadcast Message', headerTintColor: '#4ade80' }} />
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select Approved Template</Text>
        {loadingTemplates ? (
          <ActivityIndicator size="small" color="#4ade80" />
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
                onPress={() => setSelectedTemplate(item)}
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
        </View>
      )}

      <View style={[styles.section, { flex: 1 }]}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
    padding: 15,
  },
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
    flex: 1,
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
  }
});

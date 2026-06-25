import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApi } from '../context/ApiContext';

export default function BroadcastDetails() {
  const { jobId, templateName } = useLocalSearchParams();
  const { apiUrl, apiPassword } = useApi();
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const tabs = ['All', 'Pending', 'Sent', 'Delivered', 'Read', 'Failed'];

  useEffect(() => {
    fetchRecipients();
    const interval = setInterval(fetchRecipients, 5000); // Poll every 5s for real-time updates
    return () => clearInterval(interval);
  }, [apiUrl, jobId]);

  const fetchRecipients = async () => {
    if (!apiUrl || !jobId) return;
    try {
      const res = await fetch(`${apiUrl}/api/broadcasts/${jobId}`, {
        headers: { 'x-api-password': apiPassword }
      });
      const data = await res.json();
      setRecipients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#3b82f6';
      case 'sent': return '#f59e0b';
      case 'delivered': return '#10b981';
      case 'read': return '#8b5cf6';
      case 'failed': return '#ef4444';
      default: return '#9ca3af';
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredData = filter === 'All' ? recipients : recipients.filter(r => r.status.toLowerCase() === filter.toLowerCase());

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.recipientCard}>
      <View style={styles.row}>
        <Text style={styles.phoneText}>{item.phone}</Text>
        <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.dateText}>Last Update: {formatDate(item.updatedAt)}</Text>
      
      {item.status === 'failed' && item.errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Error Reason:</Text>
          <Text style={styles.errorMessage}>{item.errorMessage}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: (templateName as string) || 'Broadcast Details', headerTintColor: '#4ade80' }} />
      
      <View style={{height: 50, marginBottom: 10}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {tabs.map(tab => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tab, filter === tab && styles.activeTab]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.tabText, filter === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && recipients.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.center}>
          <Text style={{color: '#9ca3af'}}>No numbers found for this filter.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabsContainer: { alignItems: 'center', paddingHorizontal: 5 },
  tab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1f2937', marginRight: 10 },
  activeTab: { backgroundColor: '#4ade80' },
  tabText: { color: '#9ca3af', fontWeight: 'bold' },
  activeTabText: { color: '#000' },
  recipientCard: { backgroundColor: '#1f2937', padding: 15, borderRadius: 10, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  phoneText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dateText: { color: '#9ca3af', fontSize: 12 },
  statusBadge: { color: '#fff', fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, fontWeight: 'bold', overflow: 'hidden' },
  errorBox: { marginTop: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ef4444' },
  errorTitle: { color: '#ef4444', fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
  errorMessage: { color: '#fca5a5', fontSize: 12 }
});

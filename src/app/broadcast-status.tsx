import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useApi } from '../context/ApiContext';

export default function BroadcastStatus() {
  const { apiUrl, apiPassword } = useApi();
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, [apiUrl]);

  const fetchJobs = async () => {
    if (!apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/api/broadcasts`, {
        headers: { 'x-api-password': apiPassword }
      });
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderJob = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.jobCard} 
      onPress={() => router.push({ pathname: '/broadcast-details', params: { jobId: item._id, templateName: item.templateName } })}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.templateName}>{item.templateName}</Text>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>
      <Text style={styles.totalText}>Total Numbers: {item.totalNumbers}</Text>
      
      {item.stats && (
        <View style={styles.statsContainer}>
          <Text style={[styles.statBadge, {backgroundColor: '#3b82f6'}]}>Pending: {item.stats.pending}</Text>
          <Text style={[styles.statBadge, {backgroundColor: '#f59e0b'}]}>Sent: {item.stats.sent}</Text>
          <Text style={[styles.statBadge, {backgroundColor: '#10b981'}]}>Delivered: {item.stats.delivered}</Text>
          <Text style={[styles.statBadge, {backgroundColor: '#8b5cf6'}]}>Read: {item.stats.read}</Text>
          <Text style={[styles.statBadge, {backgroundColor: '#ef4444'}]}>Failed: {item.stats.failed}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Broadcast Status', headerTintColor: '#4ade80' }} />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.center}>
          <Text style={{color: '#9ca3af'}}>No broadcasts found.</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          renderItem={renderJob}
          contentContainerStyle={{ paddingBottom: 20 }}
          onRefresh={fetchJobs}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  jobCard: { backgroundColor: '#1f2937', padding: 15, borderRadius: 10, marginBottom: 10 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  templateName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dateText: { color: '#9ca3af', fontSize: 12 },
  totalText: { color: '#d1d5db', fontSize: 14, marginBottom: 10 },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  statBadge: { color: '#fff', fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, fontWeight: 'bold', overflow: 'hidden' }
});

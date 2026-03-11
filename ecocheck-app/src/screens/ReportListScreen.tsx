import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getAllReports } from '../api/reports';
import axios from 'axios';

// Define the IReport interface that matches your backend's schema
interface IReport {
  _id: string; // The unique ID from MongoDB
  name: string;
  contact: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  photoUrl: string;
  date: Date;
  status: string;
}

const ReportListScreen = () => {
  // Use the interface to type the reports state
  const [reports, setReports] = useState<IReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const response = await getAllReports();
      setReports(response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.msg || 'An error occurred while fetching reports';
        Alert.alert('Error', msg);
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Use the interface to type the item parameter
  const renderItem = ({ item }: { item: IReport }) => (
    <View style={styles.reportItem}>
      <Text style={styles.reportTitle}>{item.name}</Text>
      <Text>{item.description}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>All Reports</Text>
      <FlatList
        data={reports}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  reportItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  reportTitle: { fontWeight: 'bold' },
  status: { fontStyle: 'italic', marginTop: 5 },
});

export default ReportListScreen;
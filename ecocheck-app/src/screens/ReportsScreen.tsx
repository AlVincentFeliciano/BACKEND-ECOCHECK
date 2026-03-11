// frontend/src/screens/ReportsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import { getAllReports, confirmResolution, rejectResolution } from '../api/reports';

const { width } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ReportsScreen = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchReports = async () => {
    try {
      const data = await getAllReports();
      setReports(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, []);

  const openImageModal = (uri: string) => {
    setSelectedImage(uri);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setModalVisible(false);
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#fbc02d';
      case 'pending confirmation':
        return '#29b6f6';
      case 'on going':
        return '#ff9800';
      case 'resolved':
        return '#66bb6a';
      default:
        return '#9e9e9e';
    }
  };

  const handleConfirmResolution = async (reportId: string) => {
    Alert.alert(
      'Confirm Resolution',
      'Are you sure the issue has been resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Confirm',
          onPress: async () => {
            try {
              await confirmResolution(reportId);
              Alert.alert('Success', 'Thank you! You have earned 10 points.');
              fetchReports(); // Refresh the list
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to confirm resolution.');
            }
          },
        },
      ]
    );
  };

  const handleRejectResolution = (reportId: string) => {
    setSelectedReportId(reportId);
    setRejectionReason('');
    setRejectionModalVisible(true);
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection.');
      return;
    }

    if (!selectedReportId) return;

    try {
      await rejectResolution(selectedReportId, rejectionReason);
      Alert.alert('Success', 'Your feedback has been submitted. The report will be reviewed again.');
      setRejectionModalVisible(false);
      setRejectionReason('');
      setSelectedReportId(null);
      fetchReports(); // Refresh the list
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to submit rejection.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Reports</Text>
          <Text style={styles.headerSubtitle}>Track the status of your submissions</Text>
        </View>

        {reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No reports submitted yet.</Text>
          </View>
        ) : (
          reports.map((item, index) => {
            const isExpanded = expandedIds.has(item._id);
            const reportNumber = index + 1;
            return (
              <TouchableOpacity
                key={item._id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => toggleExpand(item._id)}
              >
                {item.photoUrl && (
                  <TouchableOpacity onPress={() => openImageModal(item.photoUrl)}>
                    <Image
                      source={{
                        uri: item.photoUrl.startsWith('http')
                          ? item.photoUrl
                          : `https://backend-ecocheck.onrender.com/api${item.photoUrl}`,
                      }}
                      style={styles.leftImage}
                    />
                  </TouchableOpacity>
                )}
                <View style={[styles.cardContent, { height: isExpanded ? undefined : 120 }]}>
                  {!isExpanded ? (
                    // Collapsed state - show only Report Number
                    <View style={styles.reportHeader}>
                      <Text style={styles.reportNumber}>Report #{reportNumber}</Text>
                      <Text style={styles.tapToExpand}>Tap to view details</Text>
                    </View>
                  ) : (
                    // Expanded state - show all details
                    <View style={styles.expandedDetails}>
                      <Text style={styles.reportNumberExpanded}>Report #{reportNumber}</Text>
                      
                      <Text style={styles.label}>Description:</Text>
                      <Text style={styles.value}>
                        {item.description}
                      </Text>

                      <Text style={styles.label}>Location:</Text>
                      <Text style={styles.value}>
                        {item.location}
                      </Text>

                      <Text style={styles.label}>Status:</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(item.status) },
                        ]}
                      >
                        <Text style={styles.statusText}>{item.status}</Text>
                      </View>

                      {/* Confirmation buttons for Pending Confirmation status */}
                      {item.status === 'Pending Confirmation' && (
                        <View style={styles.confirmationContainer}>
                          <View style={styles.confirmationInfo}>
                            <Text style={styles.confirmationText}>
                              ⚡ Please confirm if the issue has been resolved
                            </Text>
                          </View>
                          <View style={styles.buttonRow}>
                            <TouchableOpacity
                              style={styles.confirmButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleConfirmResolution(item._id);
                              }}
                            >
                              <Text style={styles.confirmButtonText}>✓ Confirm Resolved</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.rejectButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleRejectResolution(item._id);
                              }}
                            >
                              <Text style={styles.rejectButtonText}>✗ Still Not Resolved</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {item.landmark && (
                        <>
                          <Text style={styles.label}>Landmark:</Text>
                          <Text style={styles.value}>
                            {item.landmark}
                          </Text>
                        </>
                      )}

                      {item.contact && (
                        <>
                          <Text style={styles.label}>Contact:</Text>
                          <Text style={styles.value}>
                            {item.contact}
                          </Text>
                        </>
                      )}
                      
                      <Text style={styles.label}>Reported On:</Text>
                      <Text style={styles.value}>
                        {new Date(item.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Image Modal */}
        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeImageModal}>
          <View style={styles.modalOuter}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={closeImageModal} activeOpacity={1}>
              <View style={styles.modalImageContainer}>
                <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                  <Image source={{ uri: selectedImage || '' }} style={styles.modalImage} />
                </TouchableOpacity>
                
                {/* Close button */}
                <TouchableOpacity style={styles.closeButton} onPress={closeImageModal}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Rejection Modal */}
        <Modal
          visible={rejectionModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setRejectionModalVisible(false)}
        >
          <View style={styles.rejectionModalOuter}>
            <View style={styles.rejectionModalContent}>
              <Text style={styles.rejectionModalTitle}>Report Issue Not Resolved</Text>
              <Text style={styles.rejectionModalSubtitle}>
                Please explain why the issue is still not resolved:
              </Text>
              <TextInput
                style={styles.rejectionInput}
                placeholder="E.g., The trash is still there..."
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.rejectionButtonRow}>
                <TouchableOpacity
                  style={styles.rejectionCancelButton}
                  onPress={() => setRejectionModalVisible(false)}
                >
                  <Text style={styles.rejectionCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectionSubmitButton}
                  onPress={submitRejection}
                >
                  <Text style={styles.rejectionSubmitButtonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#e8f5e9',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '500',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4caf50',
    marginTop: 4,
  },
  emptyContainer: {
    marginTop: 50,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#555',
    fontStyle: 'italic',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 25,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8f5e9',
  },
  leftImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
  },
  cardContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  statusContainer: {
    marginTop: 2,
    marginBottom: 2,
  },
  expandedDetails: {
    marginTop: 8,
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  reportHeader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginHorizontal: 10,
    marginVertical: 10,
    paddingVertical: 20,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
    minHeight: 80,
  },
  reportNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b5e20',
    textAlign: 'center',
    marginBottom: 5,
  },
  reportNumberExpanded: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
    textAlign: 'center',
  },
  tapToExpand: {
    fontSize: 13,
    color: '#2e7d32',
    fontStyle: 'italic',
    marginTop: 5,
    textAlign: 'center',
    fontWeight: '600',
  },
  label: {
    fontWeight: '600',
    color: '#2e7d32',
    marginTop: 4,
    fontSize: 12,
  },
  value: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
    marginBottom: 4,
  },
  compactValue: {
    marginTop: 1,
    marginBottom: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  modalOuter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    borderRadius: 12,
    padding: 0,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  modalImage: {
    width: width * 0.85,
    height: width * 0.85,
    resizeMode: 'contain',
    borderRadius: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#f44336',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmationContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#29b6f6',
  },
  confirmationInfo: {
    marginBottom: 12,
  },
  confirmationText: {
    fontSize: 14,
    color: '#0277bd',
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#ff5722',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectionModalOuter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectionModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 10,
  },
  rejectionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
    textAlign: 'center',
  },
  rejectionModalSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 15,
    textAlign: 'center',
  },
  rejectionInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
  },
  rejectionButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectionCancelButton: {
    flex: 1,
    backgroundColor: '#9e9e9e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectionCancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectionSubmitButton: {
    flex: 1,
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectionSubmitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReportsScreen;

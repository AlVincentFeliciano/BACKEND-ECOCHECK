// /ecocheck-app/src/screens/ProfileScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { removeToken, getToken } from '../utils/auth';
import client from '../api/client';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { jwtDecode } from 'jwt-decode';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface User {
  firstName: string;
  middleInitial?: string;
  lastName: string;
  email: string;
  bio?: string;
  profilePic?: string | null;
  points?: number;
}

interface RouteParams {
  newUser?: User;
}

const STORAGE_KEY_BADGE = 'currentBadge';

/**
 * Map imageKey (string saved in AsyncStorage) to actual local require() asset.
 * Make sure these files exist in ../assets/ (badge1.png, badge2.png, ...).
 */
const BADGE_IMAGE_MAP: Record<string, any> = {
  badge1: require('../assets/badge1.png'),
  badge2: require('../assets/badge2.png'),
  badge3: require('../assets/badge3.png'),
  badge4: require('../assets/badge4.png'),
};

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams;

  const [user, setUser] = useState<User | null>(params?.newUser || null);
  const [solvedReportsCount, setSolvedReportsCount] = useState(0);
  const [currentBadge, setCurrentBadge] = useState<{ id: number; name: string; imageKey: string } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  // Field-specific error states
  const [currentPasswordError, setCurrentPasswordError] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchUser = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const userId = decoded.id;

      // Fetch user data
      const res = await client.get(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData: User = res.data?.data;
      if (userData) setUser(userData);

      // Fetch solved reports count
      try {
        const reportsRes = await client.get('/reports', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Count reports with status "Resolved" for this user
        // Backend returns array directly, not wrapped in data
        const reports = reportsRes.data || [];
        const solvedCount = reports.filter(
          (report: any) => report.status === 'Resolved' && 
          (report.user?._id === userId || report.user === userId)
        ).length || 0;
        
        console.log('📊 Profile: User resolved reports count:', solvedCount);
        setSolvedReportsCount(solvedCount);
      } catch (reportsError) {
        console.error('❌ Fetch reports error:', reportsError);
        setSolvedReportsCount(0);
      }
    } catch (error) {
      console.error('❌ Fetch user error:', error);
    }
  };

  const loadBadgeFromStorage = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_BADGE);
      if (raw) {
        setCurrentBadge(JSON.parse(raw));
      } else {
        setCurrentBadge(null);
      }
    } catch (err) {
      console.error('Error loading badge:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const initializeProfile = async () => {
        await fetchUser();
        // Load badge AFTER fetching user data and reports
        await loadBadgeFromStorage();
      };
      initializeProfile();
    }, [])
  );

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await removeToken();

      setTimeout(() => {
        setLogoutLoading(false);
        Alert.alert('Logged Out', 'You have been successfully logged out.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 800);
    } catch (error) {
      console.error('Logout error:', error);
      setLogoutLoading(false);
      Alert.alert('Error', 'Failed to log out.');
    }
  };

  const handleChangePassword = async () => {
    // Reset all error states
    setCurrentPasswordError(false);
    setNewPasswordError(false);
    setConfirmPasswordError(false);
    setErrorMsg('');

    // Validation
    if (!currentPassword) {
      setCurrentPasswordError(true);
      setErrorMsg('Current password is required');
      return;
    }
    if (!newPassword) {
      setNewPasswordError(true);
      setErrorMsg('New password is required');
      return;
    }
    if (!confirmPassword) {
      setConfirmPasswordError(true);
      setErrorMsg('Please confirm your new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setNewPasswordError(true);
      setConfirmPasswordError(true);
      setErrorMsg('New passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      await client.put(
        '/users/change-password/me',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success', 'Password changed successfully.');
      setModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('❌ Change password error:', error);
      const msg = error.response?.data?.message || 'Failed to change password';
      
      if (msg.toLowerCase().includes('current password')) {
        setCurrentPasswordError(true);
      }
      if (msg.toLowerCase().includes('new password') || msg.toLowerCase().includes('password')) {
        setNewPasswordError(true);
      }
      
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const getFullName = (user: User) => {
    return `${user.firstName || ''} ${user.middleInitial ? user.middleInitial + '.' : ''} ${user.lastName || ''}`.trim();
  };

  const handleChangeProfilePic = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        return Alert.alert('Permission required', 'Please allow photo library access.');
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled) return;

      const selectedImage = pickerResult.assets[0];
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please log in again.');
        return;
      }

      const formData = new FormData();
      formData.append('profilePic', {
        uri: selectedImage.uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      setLoading(true);

      const response = await client.put('/users/profile-pic', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        Alert.alert('Success', 'Profile picture updated!');
        fetchUser();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update profile picture.');
      }
    } catch (error: any) {
      console.error('❌ Change profile pic error:', error);
      const errorMessage = error.response?.data?.message ||
                           error.response?.data?.error ||
                           'Failed to update profile picture.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Map saved imageKey to actual asset for display
  const getBadgeImageSource = (badge: { id: number; name: string; imageKey: string } | null) => {
    if (!badge) return null;
    return BADGE_IMAGE_MAP[badge.imageKey] ?? null;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.header}>My Profile</Text>
          </View>

          {user && (
          <View style={styles.card}>
            {/* Avatar with edit pencil */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {user.profilePic ? (
                  <Image
                    source={{ uri: user.profilePic }}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarText}>{user.firstName?.charAt(0) || 'U'}</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.editIcon}
                onPress={handleChangeProfilePic}
              >
                <Ionicons name="pencil" size={14} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Name row with badge */}
            <View style={styles.nameRow}>
              <Text style={styles.name}>{getFullName(user)}</Text>
            </View>

            <Text style={styles.email}>{user.email}</Text>
            {user.bio && <Text style={styles.bio}>"{user.bio}"</Text>}
            
            {/* Stats Row */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{user.points ?? 0}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{solvedReportsCount}</Text>
                <Text style={styles.statLabel}>Reports</Text>
              </View>
            </View>

            {/* Badge display */}
            <View style={styles.badgeContainer}>
              {currentBadge && solvedReportsCount >= 10 ? (
                <>
                  <View style={styles.badgeCircle}>
                    <Image
                      source={getBadgeImageSource(currentBadge) || require('../assets/badge1.png')}
                      style={styles.badgeImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.badgeTitle}>Current Badge</Text>
                  <Text style={styles.badgeName}>{currentBadge.name}</Text>
                </>
              ) : (
                <>
                  <View style={[styles.badgeCircle, { backgroundColor: '#f5f5f5' }]}>
                    <Text style={{ fontSize: 40, color: '#ccc' }}>🔒</Text>
                  </View>
                  <Text style={styles.badgeTitle}>No Badge Yet</Text>
                  <Text style={[styles.badgeName, { color: '#999' }]}>
                    Complete 10 reports to unlock your first badge
                  </Text>
                </>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Ionicons name="create-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.actionText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButtonSecondary}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="lock-closed-outline" size={20} color="#2e7d32" style={{ marginRight: 8 }} />
                <Text style={styles.actionTextSecondary}>Change Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={logoutLoading}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>
            {logoutLoading ? 'Logging out...' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* Modal for change-password */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
            
            <TextInput
              placeholder="Current Password"
              secureTextEntry
              style={[styles.input, currentPasswordError && styles.inputError]}
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                setCurrentPasswordError(false);
                setErrorMsg('');
              }}
            />
            <TextInput
              placeholder="New Password"
              secureTextEntry
              style={[styles.input, newPasswordError && styles.inputError]}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                setNewPasswordError(false);
                setErrorMsg('');
              }}
            />
            <TextInput
              placeholder="Confirm New Password"
              secureTextEntry
              style={[styles.input, confirmPasswordError && styles.inputError]}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setConfirmPasswordError(false);
                setErrorMsg('');
              }}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleChangePassword}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {(loading || logoutLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#e8f5e9' 
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: { 
    flex: 1, 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: 20 
  },
  
  // Enhanced Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  header: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#2e7d32',
    letterSpacing: 0.5,
  },
  headerEmoji: {
    fontSize: 24,
  },

  // Profile Card
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#2e7d32',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#c8e6c9',
    position: 'relative',
    overflow: 'visible',
  },

  // Decorative Elements
  decorativeLeaf1: {
    position: 'absolute',
    top: -8,
    left: 16,
    zIndex: 10,
  },
  decorativeLeaf2: {
    position: 'absolute',
    top: -8,
    right: 16,
    zIndex: 10,
  },
  leafEmoji: {
    fontSize: 32,
    transform: [{ rotate: '15deg' }],
  },

  // Avatar Section
  avatarContainer: { 
    position: 'relative', 
    marginBottom: 16,
    marginTop: 8,
  },
  avatar: {
    backgroundColor: '#66bb6a',
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#c8e6c9',
    shadowColor: '#2e7d32',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  profileImage: { 
    width: 110, 
    height: 110, 
    borderRadius: 55 
  },
  avatarText: { 
    color: '#fff', 
    fontSize: 42, 
    fontWeight: 'bold' 
  },
  editIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#43a047',
    borderRadius: 18,
    padding: 8,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },

  // Name Section
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#2e7d32',
    textAlign: 'center',
  },

  // Contact Info
  email: { 
    fontSize: 15, 
    color: '#666', 
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  bio: { 
    fontSize: 14, 
    color: '#81c784', 
    marginBottom: 20, 
    textAlign: 'center', 
    fontStyle: 'italic',
    paddingHorizontal: 16,
    lineHeight: 20,
  },

  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f8e9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2e7d32',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#66bb6a',
    fontWeight: '600',
    textAlign: 'center',
  },
  statDivider: {
    width: 2,
    height: 40,
    backgroundColor: '#c8e6c9',
    marginHorizontal: 16,
  },

  // Badge Section
  badgeContainer: {
    alignItems: 'center',
    backgroundColor: '#f9fbe7',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    borderWidth: 2,
    borderColor: '#dce775',
    shadowColor: '#827717',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  badgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#cddc39',
    shadowColor: '#827717',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  badgeImage: {
    width: 70,
    height: 70,
  },
  badgeTitle: {
    fontSize: 12,
    color: '#827717',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeName: {
    fontSize: 18,
    color: '#558b2f',
    fontWeight: '700',
    textAlign: 'center',
  },

  // Action Buttons
  actionButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#43a047',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#2e7d32',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#66bb6a',
  },
  actionText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 16,
    letterSpacing: 0.5,
  },

  actionButtonSecondary: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#43a047',
    shadowColor: '#2e7d32',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  actionTextSecondary: { 
    color: '#2e7d32', 
    fontWeight: '700', 
    fontSize: 16,
    letterSpacing: 0.5,
  },

  // Logout Button
  logoutButton: {
    marginTop: 24,
    backgroundColor: '#e53935',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '90%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#c62828',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#ef5350',
  },
  logoutButtonText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 17,
    letterSpacing: 0.5,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.7)',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c8e6c9',
    shadowColor: '#2e7d32',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2e7d32',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 2,
    borderColor: '#c8e6c9',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    backgroundColor: '#f1f8e9',
    fontSize: 15,
    color: '#333',
  },
  inputError: {
    borderColor: '#ef5350',
    backgroundColor: '#ffebee',
  },
  saveButton: {
    backgroundColor: '#43a047',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#2e7d32',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 17,
    letterSpacing: 0.5,
  },
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: { 
    color: '#66bb6a', 
    fontWeight: '600', 
    fontSize: 16 
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(46, 125, 50, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    alignSelf: 'flex-start',
    color: '#e53935',
    marginBottom: 12,
    fontWeight: '600',
    fontSize: 14,
    paddingHorizontal: 4,
  },
});

export default ProfileScreen;

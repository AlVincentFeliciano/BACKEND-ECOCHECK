import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import client from '../api/client';
import { getToken } from '../utils/auth';
import { jwtDecode } from 'jwt-decode';

type EditProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Profile'
>;

interface DecodedToken {
  user?: { id?: string; _id?: string };
  id?: string;
  _id?: string;
}

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [bio, setBio] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch existing user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const decoded: DecodedToken = jwtDecode(token);
        const userId =
          decoded.user?.id || decoded.user?._id || decoded.id || decoded._id;

        const res = await client.get(`/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = res.data.data;
        if (userData) {
          setFirstName(userData.firstName || '');
          setMiddleName(userData.middleInitial || '');
          setLastName(userData.lastName || '');
          setContactNumber(userData.contactNumber || '');
          setBio(userData.bio || '');
          setProfilePic(userData.profilePic || null);
        }
      } catch (err) {
        console.error('❌ Fetch user error:', err);
      }
    };
    fetchUser();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Validation Error', 'First Name and Last Name are required.');
      return;
    }

    try {
      setLoading(true);

      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Not authenticated');
        setLoading(false);
        return;
      }

      const decoded: DecodedToken = jwtDecode(token);
      const userId =
        decoded.user?.id || decoded.user?._id || decoded.id || decoded._id;

      // ✅ Create FormData for multipart request
      const formData = new FormData();
      formData.append('firstName', firstName);
      formData.append('middleInitial', middleName);
      formData.append('lastName', lastName);
      formData.append('bio', bio);

      if (profilePic) {
        const filename = profilePic.split('/').pop() || 'photo.jpg';
        const ext = filename.split('.').pop()?.toLowerCase();
        const type = ext === 'png' ? 'image/png' : 'image/jpeg';

        formData.append('profilePic', {
          uri: profilePic,
          name: filename,
          type,
        } as any);
      }

      // ✅ Detect correct endpoint
      const endpoint = userId ? `/users/${userId}` : `/users/profile-pic`;

      await client.put(endpoint, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Profile Updated', 'Your profile information has been updated.');
      navigation.goBack();
    } catch (error) {
      console.error('❌ Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Edit Profile</Text>

      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={styles.profileImage} />
        ) : (
          <Text style={styles.imagePickerText}>Choose Profile Picture</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
      />

      <TextInput
        style={styles.input}
        placeholder="Middle Name (Optional)"
        value={middleName}
        onChangeText={setMiddleName}
      />

      <TextInput
        style={styles.input}
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
      />

      <View style={styles.readOnlyContainer}>
        <Text style={styles.readOnlyLabel}>Contact Number</Text>
        <View style={styles.readOnlyInput}>
          <Text style={styles.readOnlyText}>{contactNumber || 'Not provided'}</Text>
        </View>
      </View>

      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>

      {loading && (
        <Modal transparent animationType="fade">
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Saving...</Text>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f4f7' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
  },
  imagePicker: { alignItems: 'center', marginBottom: 15 },
  imagePickerText: { color: '#666', fontSize: 16 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  readOnlyContainer: { marginBottom: 15 },
  readOnlyLabel: { fontSize: 14, color: '#666', marginBottom: 5, fontWeight: '500' },
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  readOnlyText: { fontSize: 16, color: '#333' },
  saveButton: {
    backgroundColor: '#43a047',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  loadingText: { marginTop: 10, color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default EditProfileScreen;

// /ecocheck-app/src/screens/CreateReportScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Image, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { createReport } from '../api/reports';
import axios from 'axios';
import { getToken } from '../utils/auth';
import { jwtDecode } from 'jwt-decode';
import client from '../api/client';

const CreateReportScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [displayContactNumber, setDisplayContactNumber] = useState('');
  const [description, setDescription] = useState('');
  const [landmark, setLandmark] = useState('');
  const [location, setLocation] = useState(''); // Geocoded address for display
  const [userLocation, setUserLocation] = useState(''); // User's registered location (Bulaon/Del Carmen)
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);

  const [loading, setLoading] = useState(false);

  // Fetch user's registered name and pre-fill the form
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const decoded: any = jwtDecode(token);
        const userId = decoded.id;

        const res = await client.get(`/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = res.data?.data;
        if (userData) {
          // Pre-fill with registered name
          setFirstName(userData.firstName || '');
          setMiddleName(userData.middleInitial || '');
          setLastName(userData.lastName || '');
          // Store user's registered location (Bulaon or Del Carmen)
          setUserLocation(userData.location || '');
          // Pre-fill contact number (remove +63 prefix if exists)
          const contact = userData.contactNumber || '';
          if (contact.startsWith('0') && contact.length === 11) {
            const numberWithoutZero = contact.substring(1); // Remove leading 0
            setContactNumber(numberWithoutZero);
            // Format display
            let formatted = numberWithoutZero;
            if (numberWithoutZero.length > 3) {
              formatted = numberWithoutZero.slice(0, 3) + ' ' + numberWithoutZero.slice(3);
            }
            if (numberWithoutZero.length > 6) {
              formatted = numberWithoutZero.slice(0, 3) + ' ' + numberWithoutZero.slice(3, 6) + ' ' + numberWithoutZero.slice(6);
            }
            setDisplayContactNumber(formatted);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus === 'granted');

      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(locationStatus === 'granted');
    })();
  }, []);

  const takePhoto = async () => {
    if (!hasCameraPermission) {
      Alert.alert('Camera permission denied');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const getLocation = async () => {
    if (!hasLocationPermission) {
      Alert.alert('Location permission denied');
      return;
    }
    try {
      const locationData = await Location.getCurrentPositionAsync({});
      setCurrentLocation(locationData);
      const geocode = await Location.reverseGeocodeAsync({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      });
      if (geocode.length > 0) {
        const addr = geocode[0];
        setLocation(`${addr.name || ''}, ${addr.city || ''}, ${addr.country || ''}`.trim());
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get location. Try again.');
    }
  };

  const handleSubmit = async () => {
    if (!photoUri || !currentLocation) {
      Alert.alert('Missing Info', 'Please take a photo and get your location.');
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('firstName', firstName);
      formData.append('middleName', middleName);
      formData.append('lastName', lastName);
      formData.append('contact', `+63${contactNumber}`);
      formData.append('description', description);
      formData.append('landmark', landmark);
      
      // Send both locations:
      // - location: Full geocoded address for display in dashboard
      // - userLocation: User's signup location (Del Carmen/Bulaon) for filtering
      formData.append('location', location); // Full address for display
      formData.append('userLocation', userLocation || ''); // ONLY use signup location for filtering
      formData.append('latitude', String(currentLocation.coords.latitude));
      formData.append('longitude', String(currentLocation.coords.longitude));
      formData.append('photo', { uri: photoUri, type: 'image/jpeg', name: 'photo.jpg' } as any);

      await createReport(formData);

      Alert.alert('Success', 'Report submitted!');
      setFirstName(''); setMiddleName(''); setLastName('');
      setContactNumber(''); setDisplayContactNumber('');
      setDescription(''); setLandmark(''); setLocation('');
      setPhotoUri(null); setCurrentLocation(null);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        Alert.alert('Error', error.response?.data?.error || 'An error occurred');
      } else {
        Alert.alert('Error', 'Unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const isSubmitEnabled = photoUri && currentLocation;

  if (hasCameraPermission === null || hasLocationPermission === null) {
    return (
      <View style={styles.centered}>
        <Text>Requesting permissions...</Text>
      </View>
    );
  }

  if (!hasCameraPermission) return <Text>No access to camera</Text>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Report Waste</Text>

        <TextInput
          style={[styles.input, { color: '#000' }]}
          placeholder="First Name"
          placeholderTextColor="#888"
          value={firstName}
          onChangeText={setFirstName}
          importantForAutofill="no"
        />
        <TextInput
          style={[styles.input, { color: '#000' }]}
          placeholder="Middle Name"
          placeholderTextColor="#888"
          value={middleName}
          onChangeText={setMiddleName}
          importantForAutofill="no"
        />
        <TextInput
          style={[styles.input, { color: '#000' }]}
          placeholder="Last Name"
          placeholderTextColor="#888"
          value={lastName}
          onChangeText={setLastName}
          importantForAutofill="no"
        />

        <View style={styles.contactContainer}>
          <Text style={styles.countryCode}>+63</Text>
          <TextInput
            style={[styles.input, styles.contactInput, { color: '#000' }]}
            placeholder="Contact Number (e.g., 912 345 6789)"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={displayContactNumber}
            onChangeText={(text) => {
              const numericText = text.replace(/[^0-9]/g, '');
              if (numericText.length <= 10) {
                setContactNumber(numericText);
                let formatted = numericText;
                if (numericText.length > 3) formatted = numericText.slice(0, 3) + ' ' + numericText.slice(3);
                if (numericText.length > 6) formatted = numericText.slice(0, 3) + ' ' + numericText.slice(3, 6) + ' ' + numericText.slice(6);
                setDisplayContactNumber(formatted);
              }
            }}
            maxLength={12}
            importantForAutofill="no"
          />
        </View>

        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top', color: '#000' }]}
          placeholder="Description"
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
          multiline={true}
          numberOfLines={2}
          importantForAutofill="no"
        />

        <TextInput
          style={[styles.input, { color: '#000' }]}
          placeholder="Landmark"
          placeholderTextColor="#888"
          value={landmark}
          onChangeText={setLandmark}
          importantForAutofill="no"
        />

        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
        {photoUri && <Image source={{ uri: photoUri }} style={styles.imagePreview} />}

        <TouchableOpacity style={styles.button} onPress={getLocation}>
          <Text style={styles.buttonText}>Get My Location</Text>
        </TouchableOpacity>
        {location ? <Text style={styles.locationText}>Location: {location}</Text> : null}

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: isSubmitEnabled ? '#388e3c' : '#888' }]}
          onPress={handleSubmit}
          disabled={!isSubmitEnabled}
        >
          <Text style={styles.buttonText}>Submit Report</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent={true} visible={loading}>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Submitting report...</Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f4f7' },
  container: { padding: 20, alignItems: 'center' },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5, width: '100%' },
  locationText: { marginTop: 10, marginBottom: 10, fontStyle: 'italic' },
  imagePreview: { width: '100%', height: 200, resizeMode: 'contain', marginVertical: 10 },
  button: { backgroundColor: '#4caf50', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 10, marginBottom: 15, alignItems: 'center', width: '100%' },
  submitButton: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 10, marginTop: 15, alignItems: 'center', width: '100%' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#fff', fontSize: 16 },

  contactContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  countryCode: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, backgroundColor: '#f5f5f5', marginRight: 8, fontSize: 16, fontWeight: '600', color: '#333' },
  contactInput: { flex: 1, marginBottom: 0 },
});

export default CreateReportScreen;

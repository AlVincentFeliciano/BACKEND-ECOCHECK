// /ecocheck-app/src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, Alert, ImageBackground, ActivityIndicator, 
  KeyboardAvoidingView, Platform, ScrollView, Image, Animated 
} from 'react-native';
import client from '../api/client';
import axios from 'axios';
import { storeToken } from '../utils/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons'; // For eye icon toggle

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [fadeAnim] = useState(new Animated.Value(0));
  const [showPassword, setShowPassword] = useState(false); // toggle state

  const handleLogin = async () => {
    setLoading(true);
    setEmailError(false);
    setPasswordError(false);
    setErrorMsg('');

    try {
      const response = await client.post('/auth/login', {
        email: email.toLowerCase().trim(),
        password
      });
      const { token } = response.data;

      await storeToken(token);

      Alert.alert('Success', 'Login successful!');
      navigation.replace('Main');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.response?.data?.msg || 'An error occurred';
        const requiresVerification = error.response?.data?.requiresVerification;
        const userEmail = error.response?.data?.email;
        
        // Check if email verification is required
        if (requiresVerification && userEmail) {
          Alert.alert(
            'Email Not Verified',
            'Please verify your email before logging in. Check your inbox for the verification code.',
            [
              {
                text: 'Verify Now',
                onPress: () => (navigation as any).navigate('VerifyEmail', { email: userEmail }),
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return;
        }
        
        if (message.toLowerCase().includes('deactivated') || message.toLowerCase().includes('suspended')) {
          Alert.alert(
            'Account Deactivated',
            'Your account has been deactivated. Please contact support for assistance.',
            [{ text: 'OK', style: 'default' }]
          );
          return;
        }
        
        if (message.toLowerCase().includes('invalid credentials') || message.toLowerCase().includes('invalid')) {
          setEmailError(true);
          setPasswordError(true);
          setErrorMsg('Invalid email or password');
        } else if (message.toLowerCase().includes('email')) {
          setEmailError(true);
          setErrorMsg(message);
        } else if (message.toLowerCase().includes('password')) {
          setPasswordError(true);
          setErrorMsg(message);
        } else {
          setErrorMsg(message);
        }
      } else {
        setErrorMsg('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const onBgLoad = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ImageBackground
        source={require('../assets/login-bg.jpg')}
        style={styles.background}
        resizeMode="cover"
        onLoadEnd={onBgLoad}
      >
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <View style={styles.container}>
                <Image source={require('../assets/logo.png')} style={styles.logo} />
                <Text style={styles.subtitle}>Sign in to continue</Text>

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                {/* Email Input */}
                <TextInput
                  style={[styles.input, emailError && styles.inputError, { color: '#000' }]}
                  placeholder="Email"
                  placeholderTextColor="#888"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError(false);
                    setErrorMsg('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  importantForAutofill="no"
                />

                {/* Password Input with Show/Hide Toggle */}
                <View style={[styles.input, passwordError && styles.inputError, styles.passwordContainer]}>
                  <TextInput
                    style={[styles.passwordInput, { color: '#000' }]}
                    placeholder="Password"
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError(false);
                      setErrorMsg('');
                    }}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    importantForAutofill="no"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons
                      name={showPassword ? 'eye' : 'eye-off'}
                      size={22}
                      color="#888"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.button, loading && { opacity: 0.8 }]} 
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Login</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                  <Text style={styles.link}>
                    Don’t have an account? <Text style={styles.linkBold}>Sign up</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  container: {
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  logo: { width: 120, height: 120, marginBottom: 16, resizeMode: 'contain' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24, color: '#444' },
  errorText: { alignSelf: 'flex-start', color: 'red', marginBottom: 8, fontWeight: '600' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  inputError: { borderColor: 'red' },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    marginLeft: 8,
  },
  forgotText: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    color: '#2e7d32',
    fontWeight: '500',
  },
  button: {
    width: '100%',
    backgroundColor: '#2e7d32',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  link: { textAlign: 'center', color: '#444', fontSize: 14 },
  linkBold: { color: '#2e7d32', fontWeight: '600' },
});

export default LoginScreen;

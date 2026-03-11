// /ecocheck-app/src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import TabNavigator from './TabNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SplashScreen from '../screens/SplashScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen'; // ✅ Added
import ResetPasswordScreen from '../screens/ResetPasswordScreen'; // ✅ Added
import VerifyEmailScreen from '../screens/VerifyEmailScreen'; // ✅ Added

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined | { bgUri?: string };
  Signup: undefined;
  VerifyEmail: { email: string }; // ✅ Added
  Main: undefined;
  CreateReport: undefined;
  Profile: undefined;
  EditProfile: undefined;
  ForgotPassword: undefined; // ✅ Added
  ResetPassword: { email: string }; // ✅ Updated to use email
};

const Stack = createStackNavigator<RootStackParamList>();

const fadeTransition = {
  cardStyleInterpolator: ({ current }: any) => ({
    cardStyle: { opacity: current.progress },
  }),
};

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} options={fadeTransition} />
      <Stack.Screen name="Login" component={LoginScreen} options={fadeTransition} />
      <Stack.Screen name="Signup" component={SignupScreen} />

      {/* ✅ Verify Email screen */}
      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreen}
        options={{
          headerShown: true,
          title: 'Verify Email',
          headerStyle: { backgroundColor: '#2e7d32' },
          headerTintColor: '#fff',
        }}
      />

      {/* ✅ Forgot Password screen */}
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          headerShown: true,
          title: 'Forgot Password',
          headerStyle: { backgroundColor: '#2e7d32' },
          headerTintColor: '#fff',
        }}
      />

      {/* ✅ Reset Password screen */}
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{
          headerShown: true,
          title: 'Reset Password',
          headerStyle: { backgroundColor: '#2e7d32' },
          headerTintColor: '#fff',
        }}
      />

      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="CreateReport" component={CreateReportScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;

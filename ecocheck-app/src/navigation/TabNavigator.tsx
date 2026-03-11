import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, View } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type TabParamList = {
  HomeTab: undefined;
  ReportsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const ICON_SIZE = 26;

const TabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 4 },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={require('../assets/hometab.png')}
                style={{
                  width: ICON_SIZE,
                  height: ICON_SIZE,
                  tintColor: focused ? '#4fd1c5' : '#a0aec0',
                  marginBottom: 2,
                }}
                resizeMode="contain"
              />
            </View>
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={require('../assets/reporttab.png')}
                style={{
                  width: ICON_SIZE,
                  height: ICON_SIZE,
                  tintColor: focused ? '#4fd1c5' : '#a0aec0',
                  marginBottom: 2,
                }}
                resizeMode="contain"
              />
            </View>
          ),
          tabBarLabel: 'Reports',
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={require('../assets/profiletab.png')}
                style={{
                  width: ICON_SIZE,
                  height: ICON_SIZE,
                  tintColor: focused ? '#4fd1c5' : '#a0aec0',
                  marginBottom: 2,
                }}
                resizeMode="contain"
              />
            </View>
          ),
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
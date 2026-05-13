import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';

import SplashScreen from '../screens/SplashScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import PlanExplorerScreen from '../screens/main/PlanExplorerScreen';
import SavedPlansScreen from '../screens/main/SavedPlansScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import Step1Screen from '../screens/assessment/Step1Screen';
import Step2Screen from '../screens/assessment/Step2Screen';
import Step3Screen from '../screens/assessment/Step3Screen';
import Step4Screen from '../screens/assessment/Step4Screen';
import Step5Screen from '../screens/assessment/Step5Screen';
import PlanDetailScreen from '../screens/main/PlanDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Assessment = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1B5E20',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: { paddingBottom: 4 },
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Explore" component={PlanExplorerScreen} options={{ tabBarLabel: 'Explore' }} />
      <Tab.Screen name="Saved" component={SavedPlansScreen} options={{ tabBarLabel: 'Saved' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function AssessmentStack() {
  return (
    <Assessment.Navigator screenOptions={{ headerShown: false }}>
      <Assessment.Screen name="Step1" component={Step1Screen} />
      <Assessment.Screen name="Step2" component={Step2Screen} />
      <Assessment.Screen name="Step3" component={Step3Screen} />
      <Assessment.Screen name="Step4" component={Step4Screen} />
      <Assessment.Screen name="Step5" component={Step5Screen} />
    </Assessment.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  // Show spinner while Supabase restores the JWT session from AsyncStorage
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F6F4' }}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        // ─── Authenticated stack ───────────────────────────────────────────────
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Assessment" component={AssessmentStack} options={{ presentation: 'modal' }} />
          <Stack.Screen name="PlanDetail" component={PlanDetailScreen} />
        </>
      ) : (
        // ─── Unauthenticated stack ─────────────────────────────────────────────
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

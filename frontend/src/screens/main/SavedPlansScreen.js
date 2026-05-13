import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase, getSavedPlanIds, toggleSavedPlan } from '../../api/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SavedPlansScreen({ navigation }) {
  const { user } = useAuth();
  const [savedPlans, setSavedPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSavedPlans = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      // Get saved plan IDs from Supabase
      const savedIds = await getSavedPlanIds(user.id);

      // Get plan data (from cache if available)
      const cached = await AsyncStorage.getItem('fidsurance_plans');
      const allPlans = cached ? JSON.parse(cached) : [];

      const saved = allPlans.filter(p => savedIds.includes(p.id));
      setSavedPlans(saved);
    } catch (err) {
      console.warn('Saved plans load failed:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadSavedPlans(); }, []);

  async function handleUnsave(planId) {
    await toggleSavedPlan(user.id, planId);
    setSavedPlans(prev => prev.filter(p => p.id !== planId));
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F6F4] justify-center items-center">
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      <View className="px-6 pt-6 pb-4 bg-white border-b border-[#E0E0E0]">
        <Text className="text-xl font-bold text-[#1B5E20]">Saved Plans</Text>
        <Text className="text-[#757575] text-sm mt-1">{savedPlans.length} plan{savedPlans.length !== 1 ? 's' : ''} saved</Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSavedPlans(); }} />}
      >
        {savedPlans.length === 0 ? (
          <View className="items-center mt-20">
            <Text className="text-5xl mb-4">🔖</Text>
            <Text className="text-xl font-bold text-[#1B5E20] mb-2">No saved plans yet</Text>
            <Text className="text-[#757575] text-center mb-8">
              Tap the save button on any plan card to bookmark it for later.
            </Text>
            <TouchableOpacity
              className="bg-[#1B5E20] px-6 py-3 rounded-xl"
              onPress={() => navigation.navigate('Explore')}
            >
              <Text className="text-white font-bold">Explore Plans</Text>
            </TouchableOpacity>
          </View>
        ) : (
          savedPlans.map((plan, i) => (
            <View key={plan.id || i} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-[#E0E0E0]">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 pr-2">
                  <Text className="text-[#757575] text-xs font-bold uppercase mb-1">{plan.insurer}</Text>
                  <Text className="text-[#212121] font-bold text-lg leading-5">{plan.name}</Text>
                </View>
                <TouchableOpacity onPress={() => handleUnsave(plan.id)}>
                  <Text className="text-2xl">🔖</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row mt-3 mb-4">
                <View className="mr-6">
                  <Text className="text-[#757575] text-xs">Coverage</Text>
                  <Text className="text-[#212121] font-bold">₹{(plan.coverage / 100000).toFixed(0)}L</Text>
                </View>
                <View>
                  <Text className="text-[#757575] text-xs">Premium/yr</Text>
                  <Text className="text-[#1B5E20] font-bold">₹{plan.annual_premium?.toLocaleString()}</Text>
                </View>
              </View>

              <TouchableOpacity
                className="bg-[#E8F5E9] py-3 rounded-xl items-center border border-[#A5D6A7]"
                onPress={() => navigation.navigate('PlanDetail', { plan, userProfile: null })}
              >
                <Text className="text-[#1B5E20] font-bold">View Details</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateOnDeviceReasoning } from '../../api/onDeviceAI';

export default function PlanDetailScreen({ navigation, route }) {
  const { plan, userProfile } = route.params;
  const [aiReason, setAiReason] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReason() {
      const reason = await generateOnDeviceReasoning(plan, userProfile);
      setAiReason(reason);
      setLoading(false);
    }
    fetchReason();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-[#E0E0E0] flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4 p-2">
          <Text className="text-[#1B5E20] text-lg font-bold">←</Text>
        </TouchableOpacity>
        <View>
          <Text className="text-[#757575] text-xs uppercase">{plan.insurer}</Text>
          <Text className="text-[#1B5E20] font-bold text-lg">{plan.name}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        
        {/* Match Score */}
        <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-[#E0E0E0] items-center">
          <Text className="text-[#757575] font-bold mb-2 uppercase">Fidsurance Match Score</Text>
          <View className="w-20 h-20 bg-[#E8F5E9] rounded-full justify-center items-center border-4 border-[#4CAF50] mb-2">
            <Text className="text-[#1B5E20] font-bold text-3xl">{plan.suitability_score}</Text>
          </View>
          <Text className="text-[#4CAF50] font-bold text-lg">Excellent Match</Text>
        </View>

        {/* AI Explanation Box */}
        <View className="bg-[#E8F5E9] rounded-2xl p-5 mb-6 border border-[#A5D6A7]">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">✨</Text>
            <Text className="text-[#1B5E20] font-bold">Why this fits your profile</Text>
          </View>
          {loading ? (
            <View className="py-4 items-center flex-row">
              <ActivityIndicator color="#1B5E20" size="small" />
              <Text className="ml-3 text-[#1B5E20]">Agent is reading policy details...</Text>
            </View>
          ) : (
            <Text className="text-[#212121] leading-6 text-base">{aiReason}</Text>
          )}
        </View>

        {/* Plan Details grid */}
        <Text className="text-xl font-bold text-[#1B5E20] mb-4">Plan Details</Text>
        
        <View className="flex-row flex-wrap justify-between mb-2">
          <View className="bg-white p-4 rounded-2xl w-[48%] mb-4 border border-[#E0E0E0]">
            <Text className="text-[#757575] text-xs mb-1">Coverage Amount</Text>
            <Text className="text-[#212121] font-bold text-lg">₹{(plan.coverage / 100000).toFixed(1)}L</Text>
          </View>
          <View className="bg-white p-4 rounded-2xl w-[48%] mb-4 border border-[#E0E0E0]">
            <Text className="text-[#757575] text-xs mb-1">Annual Premium</Text>
            <Text className="text-[#212121] font-bold text-lg">₹{plan.annual_premium.toLocaleString()}</Text>
          </View>
          <View className="bg-white p-4 rounded-2xl w-[48%] mb-4 border border-[#E0E0E0]">
            <Text className="text-[#757575] text-xs mb-1">Room Rent Limit</Text>
            <Text className="text-[#212121] font-bold">Single Private</Text>
          </View>
          <View className="bg-white p-4 rounded-2xl w-[48%] mb-4 border border-[#E0E0E0]">
            <Text className="text-[#757575] text-xs mb-1">Co-payment</Text>
            <Text className="text-[#212121] font-bold">0%</Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-5 mb-24 border border-[#E0E0E0]">
          <Text className="text-[#212121] font-bold mb-3">Pre-existing Conditions</Text>
          <View className="flex-row items-center justify-between py-2 border-b border-[#F4F6F4]">
            <Text className="text-[#757575]">Waiting Period</Text>
            <Text className="text-[#212121] font-bold">{plan.pre_existing_wait_years} Years</Text>
          </View>
          <View className="flex-row items-center justify-between py-2">
            <Text className="text-[#757575]">Day 1 Diabetes Cover</Text>
            <Text className={plan.diabetes_day1 ? "text-[#4CAF50] font-bold" : "text-[#E64A19] font-bold"}>
              {plan.diabetes_day1 ? "Included" : "Not Included"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Buy Button */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-[#E0E0E0] flex-row justify-between items-center">
        <View>
          <Text className="text-[#757575] text-xs">Total Premium</Text>
          <Text className="text-[#1B5E20] font-bold text-2xl">₹{plan.annual_premium.toLocaleString()}</Text>
        </View>
        <TouchableOpacity className="bg-[#1B5E20] py-4 px-8 rounded-xl items-center shadow-sm">
          <Text className="text-white font-bold text-lg">Buy Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

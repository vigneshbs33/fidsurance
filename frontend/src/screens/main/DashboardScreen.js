import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen({ navigation, route }) {
  // Try to get data from assessment; if not, show empty state or mock data
  const result = route.params?.assessmentResult;
  const profile = route.params?.userProfile;

  if (!result) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F6F4] p-6 justify-center items-center">
        <Text className="text-2xl font-bold text-[#1B5E20] mb-4">No Health Profile</Text>
        <Text className="text-[#757575] text-center mb-8">Complete the health assessment to get personalized insurance recommendations.</Text>
        <TouchableOpacity 
          className="bg-[#4CAF50] py-4 px-8 rounded-xl items-center"
          onPress={() => navigation.navigate('Assessment')}
        >
          <Text className="text-white font-bold text-lg">Start Assessment</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { risk_assessment, recommended_plans } = result;
  
  // Dynamic styling based on Risk Tier
  let tierColor = "#F9A825"; // Medium
  let tierBg = "#FFF9C4";
  if (risk_assessment.risk_tier === "LOW") {
    tierColor = "#388E3C";
    tierBg = "#E8F5E9";
  } else if (risk_assessment.risk_tier === "HIGH") {
    tierColor = "#E64A19";
    tierBg = "#FBE9E7";
  } else if (risk_assessment.risk_tier === "CRITICAL") {
    tierColor = "#B71C1C";
    tierBg = "#FFEBEE";
  }

  const scorePercentage = Math.round((1 - risk_assessment.risk_score) * 100);

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-[#E0E0E0] flex-row justify-between items-center">
        <View>
          <Text className="text-[#757575]">Welcome back,</Text>
          <Text className="text-[#1B5E20] text-xl font-bold">{profile?.fullName || "User"}</Text>
        </View>
        <View className="w-10 h-10 bg-[#E0E0E0] rounded-full" />
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Risk Score Card */}
        <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-[#E0E0E0]">
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="text-[#757575] font-bold mb-1">HEALTH SCORE</Text>
              <Text className="text-4xl font-bold text-[#212121]">{scorePercentage}<Text className="text-2xl text-[#757575]">/100</Text></Text>
            </View>
            <View className={`px-3 py-1 rounded-full`} style={{ backgroundColor: tierBg }}>
              <Text style={{ color: tierColor, fontWeight: 'bold' }}>{risk_assessment.risk_tier} RISK</Text>
            </View>
          </View>
          <Text className="text-[#757575] leading-5">Based on your HbA1c ({profile?.hba1c}%) and BP ({profile?.bp_systolic}), our AI categorized you in this tier.</Text>
        </View>

        {/* Recommended Plans Section */}
        <Text className="text-xl font-bold text-[#1B5E20] mb-4">Top Matches for You</Text>
        
        {recommended_plans.map((plan, index) => (
          <TouchableOpacity 
            key={index}
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-[#E0E0E0]"
            onPress={() => navigation.navigate('PlanDetail', { plan, userProfile: profile })}
          >
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1 pr-2">
                <Text className="text-[#757575] text-xs font-bold mb-1 uppercase">{plan.insurer}</Text>
                <Text className="text-[#212121] font-bold text-lg leading-6">{plan.name}</Text>
              </View>
              <View className="bg-[#E8F5E9] w-12 h-12 rounded-full items-center justify-center border border-[#A5D6A7]">
                <Text className="text-[#1B5E20] font-bold text-lg">{plan.suitability_score}</Text>
              </View>
            </View>

            <View className="flex-row mb-4">
              <View className="mr-6">
                <Text className="text-[#757575] text-xs">Coverage</Text>
                <Text className="text-[#212121] font-bold">₹{(plan.coverage / 100000).toFixed(1)}L</Text>
              </View>
              <View>
                <Text className="text-[#757575] text-xs">Premium/yr</Text>
                <Text className="text-[#1B5E20] font-bold">₹{plan.annual_premium.toLocaleString()}</Text>
              </View>
            </View>

            {/* Badges */}
            <View className="flex-row flex-wrap">
              {plan.diabetes_day1 && (
                <View className="bg-[#E8F5E9] px-2 py-1 rounded-md mr-2 mb-2">
                  <Text className="text-[#1B5E20] text-xs font-bold">Day 1 Diabetes Cover</Text>
                </View>
              )}
              {plan.pre_existing_wait_years > 0 ? (
                <View className="bg-[#FFF9C4] px-2 py-1 rounded-md mr-2 mb-2">
                  <Text className="text-[#F9A825] text-xs font-bold">{plan.pre_existing_wait_years}yr Wait</Text>
                </View>
              ) : (
                <View className="bg-[#E8F5E9] px-2 py-1 rounded-md mr-2 mb-2">
                  <Text className="text-[#1B5E20] text-xs font-bold">No Wait Period</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}

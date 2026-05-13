import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const loadingTexts = [
  'Analysing your health profile…',
  'Running risk model…',
  'Matching plans to your profile…',
  'Generating AI explanations…',
];

export default function Step5Screen({ navigation, route }) {
  const { assessmentDraft, assessmentResult } = route.params;
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex(prev => (prev + 1) % loadingTexts.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Wait a minimum 3 seconds so the user sees the AI loading animation
    const timer = setTimeout(() => {
      navigation.replace('Main', {
        screen: 'Home',
        params: { assessmentResult, userProfile: assessmentDraft },
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#0A2E0A] justify-center items-center p-6">
      <View className="w-32 h-32 bg-[#1B5E20] rounded-full justify-center items-center mb-10 shadow-lg border-4 border-[#4CAF50]">
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
      <Text className="text-white font-bold text-2xl mb-4 text-center">Please Wait</Text>
      <Text className="text-[#E0E0E0] text-lg text-center">
        {loadingTexts[textIndex]}
      </Text>
    </SafeAreaView>
  );
}

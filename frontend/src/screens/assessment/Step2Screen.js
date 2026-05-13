import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step2Screen({ navigation, route }) {
  const { assessmentDraft } = route.params;

  const [diabetes, setDiabetes] = useState(false);
  const [prediabetes, setPrediabetes] = useState(false);
  const [hypertension, setHypertension] = useState(false);
  const [smoker, setSmoker] = useState(false);
  const [familyDm, setFamilyDm] = useState(false);
  const [chronicCount, setChronicCount] = useState(0);

  function handleNext() {
    const updatedDraft = {
      ...assessmentDraft,
      diabetes: diabetes ? 1 : 0,
      has_diabetes: diabetes,
      prediabetes,
      hypertension: hypertension ? 1 : 0,
      has_hypertension: hypertension,
      smoker: smoker ? 1 : 0,
      family_dm_history: familyDm,
      chronic_count: chronicCount,
    };
    navigation.navigate('Step3', { assessmentDraft: updatedDraft });
  }

  function ToggleRow({ label, value, onValueChange }) {
    return (
      <View className="flex-row justify-between items-center bg-white p-4 rounded-xl border border-[#E0E0E0] mb-3">
        <Text className="text-[#212121] text-base">{label}</Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
          thumbColor={value ? '#1B5E20' : '#f4f3f4'}
        />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      {/* Progress Bar */}
      <View className="px-6 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-[#1B5E20] text-lg font-bold">←</Text>
        </TouchableOpacity>
        <View className="flex-1 h-2 bg-[#E0E0E0] rounded-full overflow-hidden">
          <View className="w-2/5 h-full bg-[#4CAF50]" />
        </View>
        <Text className="ml-4 text-[#757575] font-bold">2 / 5</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-2 pb-24">
        <Text className="text-2xl font-bold text-[#1B5E20] mb-2">Tell us what we should know</Text>
        <Text className="text-[#757575] mb-6 leading-5">You can also upload a lab report next and our AI will extract this automatically.</Text>
        
        <ToggleRow label="Diagnosed with Diabetes?" value={diabetes} onValueChange={setDiabetes} />
        <ToggleRow label="Pre-diabetic?" value={prediabetes} onValueChange={setPrediabetes} />
        <ToggleRow label="Diagnosed with Hypertension?" value={hypertension} onValueChange={setHypertension} />
        <ToggleRow label="Smoker?" value={smoker} onValueChange={setSmoker} />
        <ToggleRow label="Family history of Diabetes?" value={familyDm} onValueChange={setFamilyDm} />

        <View className="bg-white p-4 rounded-xl border border-[#E0E0E0] mb-8 mt-2">
          <Text className="text-[#212121] text-base mb-4">Number of other chronic conditions</Text>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity 
              onPress={() => setChronicCount(Math.max(0, chronicCount - 1))}
              className="w-10 h-10 bg-[#E8F5E9] rounded-full items-center justify-center"
            >
              <Text className="text-[#1B5E20] text-xl font-bold">-</Text>
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-[#212121]">{chronicCount}</Text>
            <TouchableOpacity 
              onPress={() => setChronicCount(Math.min(6, chronicCount + 1))}
              className="w-10 h-10 bg-[#E8F5E9] rounded-full items-center justify-center"
            >
              <Text className="text-[#1B5E20] text-xl font-bold">+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-[#F4F6F4] border-t border-[#E0E0E0]">
        <TouchableOpacity 
          className="bg-[#1B5E20] py-4 rounded-xl items-center"
          onPress={handleNext}
        >
          <Text className="text-white font-bold text-lg">Next →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

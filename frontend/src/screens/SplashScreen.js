import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SplashScreen({ navigation }) {
  return (
    <SafeAreaView className="flex-1 bg-[#0A2E0A] justify-center items-center p-6">
      <View className="flex-1 justify-center items-center">
        {/* Placeholder for Shield Icon */}
        <View className="w-24 h-24 bg-[#4CAF50] rounded-full justify-center items-center mb-6">
          <Text className="text-white font-bold text-4xl">F</Text>
        </View>
        <Text className="text-white font-bold text-4xl mb-2">Fidsurance</Text>
        <Text className="text-[#E0E0E0] text-lg text-center">Your health. Your plan. Explained.</Text>
      </View>
      
      <View className="w-full pb-8">
        <TouchableOpacity 
          className="bg-[#4CAF50] py-4 rounded-xl mb-4 items-center"
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text className="text-white font-bold text-lg">Create Account</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="border border-[#4CAF50] py-4 rounded-xl items-center"
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text className="text-[#4CAF50] font-bold text-lg">Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';

export default function SignInScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('demo@fidsurance.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      await signIn(email, password);
      // Check if the user has completed onboarding (profile has date_of_birth or age)
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('date_of_birth, full_name')
        .eq('id', user.id)
        .single();

      if (profile?.date_of_birth) {
        // Onboarding already done — go to dashboard
        navigation.replace('Main');
      } else {
        // First time — go to onboarding
        navigation.replace('Assessment', {
          screen: 'Step1',
          params: { fullName: profile?.full_name || '' },
        });
      }
    } catch (err) {
      // Fallback for hackathon demo if Supabase isn't fully configured
      console.log('Auth error, using demo fallback:', err.message);
      navigation.replace('Main');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4] p-6">
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-[#1B5E20] mb-2">Welcome Back</Text>
        <Text className="text-[#757575] mb-8">Sign in to view your recommendations.</Text>

        <Text className="text-[#757575] mb-2 ml-1">Email</Text>
        <TextInput
          className="bg-white border border-[#E0E0E0] rounded-xl px-4 py-4 mb-4 text-[#212121]"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text className="text-[#757575] mb-2 ml-1">Password</Text>
        <TextInput
          className="bg-white border border-[#E0E0E0] rounded-xl px-4 py-4 mb-8 text-[#212121]"
          placeholder="Enter your password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          className="bg-[#1B5E20] py-4 rounded-xl items-center"
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white font-bold text-lg">Sign In</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity className="mt-6 items-center" onPress={() => navigation.navigate('SignUp')}>
          <Text className="text-[#4CAF50] font-bold">Don't have an account? Create one</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

export default function SignUpScreen({ navigation }) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!fullName || !email || !password) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, fullName);
      // JWT is now stored in AsyncStorage — navigate to onboarding
      navigation.replace('Assessment', { screen: 'Step1', params: { fullName } });
    } catch (err) {
      Alert.alert('Sign Up Failed', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4] p-6">
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-[#1B5E20] mb-2">Create Account</Text>
        <Text className="text-[#757575] mb-8">Your health data stays private. Always.</Text>

        <Text className="text-[#757575] mb-2 ml-1">Full Name</Text>
        <TextInput
          className="bg-white border border-[#E0E0E0] rounded-xl px-4 py-4 mb-4 text-[#212121]"
          placeholder="Enter your full name"
          value={fullName}
          onChangeText={setFullName}
        />

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
          placeholder="Create a password (min 6 chars)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          className="bg-[#1B5E20] py-4 rounded-xl items-center"
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white font-bold text-lg">Create Account</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity className="mt-6 items-center" onPress={() => navigation.navigate('SignIn')}>
          <Text className="text-[#4CAF50] font-bold">Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

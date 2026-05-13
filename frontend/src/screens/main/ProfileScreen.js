import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase, getLatestRecommendation } from '../../api/supabase';

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [latestRec, setLatestRec] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) { setLoading(false); return; }
      try {
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(p);

        const rec = await getLatestRecommendation(user.id);
        setLatestRec(rec);
      } catch (err) {
        console.warn('Profile load error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await signOut();
          // RootNavigator will automatically switch to auth stack
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F6F4] justify-center items-center">
        <ActivityIndicator size="large" color="#1B5E20" />
      </SafeAreaView>
    );
  }

  const tierColor = { LOW: '#388E3C', MEDIUM: '#F9A825', HIGH: '#E64A19', CRITICAL: '#B71C1C' };
  const color = tierColor[latestRec?.risk_tier] || '#757575';

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      <View className="px-6 pt-6 pb-4 bg-white border-b border-[#E0E0E0]">
        <Text className="text-xl font-bold text-[#1B5E20]">Profile</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6">
        {/* Avatar + Name */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 bg-[#E8F5E9] rounded-full items-center justify-center border-2 border-[#4CAF50] mb-3">
            <Text className="text-3xl font-bold text-[#1B5E20]">
              {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
            </Text>
          </View>
          <Text className="text-xl font-bold text-[#212121]">{profile?.full_name || 'User'}</Text>
          <Text className="text-[#757575] text-sm">{user?.email}</Text>
        </View>

        {/* Risk Score Card */}
        {latestRec && (
          <View className="bg-white rounded-2xl p-5 mb-4 border border-[#E0E0E0] shadow-sm">
            <Text className="text-[#757575] text-xs font-bold uppercase mb-2">Latest Risk Assessment</Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-3xl font-bold text-[#212121]">
                {Math.round((1 - latestRec.risk_score) * 100)}
                <Text className="text-lg text-[#757575]">/100</Text>
              </Text>
              <View className="px-3 py-1 rounded-full" style={{ backgroundColor: color + '22' }}>
                <Text style={{ color, fontWeight: 'bold' }}>{latestRec.risk_tier} RISK</Text>
              </View>
            </View>
          </View>
        )}

        {/* Personal Info */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-[#E0E0E0] shadow-sm">
          <Text className="text-[#212121] font-bold mb-3">Personal Details</Text>
          {[
            ['City', profile?.city],
            ['Annual Income', profile?.annual_income ? `₹${Number(profile.annual_income).toLocaleString()}` : '—'],
            ['Monthly Budget', profile?.monthly_budget ? `₹${Number(profile.monthly_budget).toLocaleString()}` : '—'],
          ].map(([label, val]) => (
            <View key={label} className="flex-row justify-between py-2 border-b border-[#F4F6F4]">
              <Text className="text-[#757575]">{label}</Text>
              <Text className="text-[#212121] font-bold">{val || '—'}</Text>
            </View>
          ))}
        </View>

        {/* Privacy Statement */}
        <View className="bg-[#E8F5E9] p-4 rounded-2xl border border-[#A5D6A7] mb-4">
          <Text className="text-[#1B5E20] font-bold mb-2">🔒 Your Privacy</Text>
          <Text className="text-[#212121] leading-5 text-sm">
            Your lab documents are never stored on our servers. Health vitals are deleted from our
            servers immediately after your recommendations are generated. Only your risk score and plan
            rankings are stored permanently.
          </Text>
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="bg-white border border-[#E64A19] py-4 rounded-xl items-center mb-10"
          onPress={handleLogout}
        >
          <Text className="text-[#E64A19] font-bold text-lg">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

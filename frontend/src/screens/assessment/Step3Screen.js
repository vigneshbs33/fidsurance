import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

// Mock text extraction for Hackathon prototype (can be replaced with real pdf.js logic if needed)
async function mockExtractPDFText() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve("LAB REPORT: Patient shows HbA1c of 6.2%, BP is 128/84. BMI calculated at 26.5. Noted family history of diabetes.");
    }, 2000);
  });
}

function computeConfidence(text) {
  let score = 0;
  if (/hba1c/i.test(text)) score += 25;
  if (/blood pressure|bp/i.test(text)) score += 25;
  if (/bmi/i.test(text)) score += 25;
  if (/glucose/i.test(text)) score += 15;
  if (/lab|report|diagnostic/i.test(text)) score += 10;
  return Math.min(score, 100);
}

export default function Step3Screen({ navigation, route }) {
  const { assessmentDraft } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [readyToConfirm, setReadyToConfirm] = useState(false);
  const [extractedData, setExtractedData] = useState({});
  const scrollViewRef = useRef();

  const systemPrompt = `
You are Fidsurance's health assessment agent. Your job is to help users fill in their health profile by reading their lab report and asking friendly follow-up questions.

Rules:
- Be conversational, warm, and concise. Use simple language.
- When you get extracted text from a lab report, identify: HbA1c, Blood Pressure (systolic), BMI, Fasting Glucose, Diabetes diagnosis, Hypertension diagnosis, Pre-diabetic status, Family history of diabetes.
- For each value you find, confirm it clearly with the ✅ emoji and the number.
- For each value you CANNOT find, ask for it in a friendly way. Example: "I couldn't find your HbA1c — do you know it from a recent blood test?"
- If the user says "skip", "don't know", or "continue", accept it and use a note like "(will use average)" — NEVER block progress.
- Once you have HbA1c, Systolic BP, and BMI (or user has skipped them), send a confirmation summary and tell the user to press Confirm.
- Do NOT give medical advice. Do NOT diagnose. Only confirm what the report says.
- Keep each response under 120 words.
- Use bullet points with ✅ for found values and ❓ for missing ones.
`;

  useEffect(() => {
    // Initial Gemma message
    setTimeout(() => {
      setMessages([{
        id: 1,
        sender: 'ai',
        text: "Hello! I'm your Fidsurance health agent. I'll help read your lab report and fill in your health profile automatically.\n\nYou can:\n• Attach a PDF or photo of your lab report using the 📎 button\n• Or just type your values directly if you have them handy\n\nEither way, I'll ask about anything that's missing. Shall we start?"
      }]);
    }, 1000);
  }, []);

  async function agentReply(promptText, isFile, currentExtracted) {
    await new Promise(r => setTimeout(r, 1200));

    if (isFile) {
      const found = [];
      const missing = [];

      if (currentExtracted.hba1c)      found.push(`✅ HbA1c: ${currentExtracted.hba1c}%`);
      else                              missing.push('❓ HbA1c — do you know it from a recent blood test?');

      if (currentExtracted.bp_systolic) found.push(`✅ Systolic BP: ${currentExtracted.bp_systolic} mmHg`);
      else                              missing.push('❓ Blood Pressure (Systolic) — e.g. the first number in 128/84');

      if (currentExtracted.bmi)         found.push(`✅ BMI: ${currentExtracted.bmi}`);
      else                              missing.push('❓ BMI — check a recent report or use a BMI calculator');

      const confidence = currentExtracted.confidence || 0;
      const confText = confidence >= 80
        ? "I'm confident in these readings."
        : confidence >= 50
        ? "Some values were unclear — please verify."
        : "This document was hard to parse — please type values directly if needed.";

      const lines = [
        `Got it! Here's what I found in your report:\n`,
        ...found,
        missing.length > 0 ? `\nI couldn't find:\n` : '',
        ...missing,
        `\n${confText}`,
        missing.length === 0
          ? "\nAll key values captured! Press **Confirm & Review Data** when ready."
          : "\nType any missing values above, or press **Confirm** to use safe defaults.",
      ].filter(Boolean);

      if (missing.length === 0) setReadyToConfirm(true);
      return lines.join('\n');
    }

    // User typed a text reply
    const lower = promptText.toLowerCase();
    const skipWords = ['skip', 'continue', "don't know", 'idk', 'na', 'n/a', 'no idea'];
    if (skipWords.some(k => lower.includes(k))) {
      setReadyToConfirm(true);
      return "No problem! I'll use standard averages for any missing values.\n\nPress **Confirm & Review Data** — you can edit everything on the next screen before it's sent to the risk model.";
    }

    // They likely typed a number
    if (/\d/.test(promptText)) {
      setReadyToConfirm(true);
      return `Noted! Press **Confirm & Review Data** to continue. You can double-check all values on the next screen before anything is sent.`;
    }

    setReadyToConfirm(true);
    return `Thanks! Press **Confirm & Review Data** whenever you're ready. You can still edit everything on the next screen.`;
  }

  async function handleSend(text = inputText, isFile = false) {
    if (!text.trim() && !isFile) return;

    const userMsg = isFile ? '📄 [User uploaded a document]' : text;
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userMsg }]);
    setInputText('');
    setIsTyping(true);

    let currentExtracted = extractedData;

    if (isFile) {
      const rawText = await mockExtractPDFText();
      const hba1cMatch = rawText.match(/hba1c[\s:]*(\d+\.?\d*)/i);
      const bpMatch    = rawText.match(/(?:blood pressure|bp|systolic)[\s:]*(\d{2,3})\s*[\/\-]/i);
      const bmiMatch   = rawText.match(/bmi[\s:]*(\d+\.?\d*)/i);
      currentExtracted = {
        hba1c:       hba1cMatch ? parseFloat(hba1cMatch[1]) : null,
        bp_systolic: bpMatch    ? parseInt(bpMatch[1])      : null,
        bmi:         bmiMatch   ? parseFloat(bmiMatch[1])   : null,
        confidence:  computeConfidence(rawText),
      };
      setExtractedData(currentExtracted);
    }

    const aiResponse = await agentReply(text, isFile, currentExtracted);
    setIsTyping(false);
    setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: aiResponse }]);
  }

  async function handleAttach() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        handleSend('Processing document...', true);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleConfirm() {
    const finalDraft = {
      ...assessmentDraft,
      ...extractedData
    };
    navigation.navigate('Step4', { assessmentDraft: finalDraft });
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      {/* Header */}
      <View className="bg-white border-b border-[#E0E0E0] px-4 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-[#1B5E20] text-lg font-bold">← Back</Text>
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Text className="text-xl">✨ </Text>
          <Text className="text-lg font-bold text-[#1B5E20]">Health Agent</Text>
        </View>
        <Text className="text-[#757575] font-bold">3 / 5</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1 px-4 py-4"
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
        >
          {messages.map(msg => (
            <View 
              key={msg.id} 
              className={`mb-4 max-w-[85%] rounded-2xl p-4 ${msg.sender === 'ai' ? 'bg-[#E8F5E9] self-start rounded-tl-sm' : 'bg-[#1B5E20] self-end rounded-tr-sm'}`}
            >
              {msg.sender === 'ai' && <Text className="absolute -left-2 top-2 text-lg">✨</Text>}
              <Text className={`${msg.sender === 'ai' ? 'text-[#212121]' : 'text-white'} text-base leading-6`}>
                {msg.text}
              </Text>
            </View>
          ))}
          {isTyping && (
            <View className="bg-[#E8F5E9] self-start rounded-2xl rounded-tl-sm p-4 mb-4">
              <ActivityIndicator color="#1B5E20" size="small" />
            </View>
          )}
        </ScrollView>

        {readyToConfirm && (
          <View className="px-4 py-2">
            <TouchableOpacity 
              className="bg-[#4CAF50] py-4 rounded-xl items-center shadow-sm"
              onPress={handleConfirm}
            >
              <Text className="text-white font-bold text-lg">Confirm & Review Data →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        <View className="flex-row items-center px-4 py-3 bg-white border-t border-[#E0E0E0]">
          <TouchableOpacity onPress={handleAttach} className="mr-3 bg-[#F4F6F4] p-3 rounded-full">
            <Text className="text-xl">📎</Text>
          </TouchableOpacity>
          <TextInput 
            className="flex-1 bg-[#F4F6F4] rounded-2xl px-4 py-3 text-[#212121]"
            placeholder="Type a reply..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity onPress={() => handleSend(inputText)} className="ml-3 bg-[#1B5E20] p-3 rounded-full w-12 h-12 items-center justify-center">
            <Text className="text-white text-lg font-bold">➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

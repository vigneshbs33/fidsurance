import { supabase, getJWT } from './supabase';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.0.2.2:8000/api';

/**
 * Call the FastAPI risk assessment endpoint.
 * Automatically attaches the Supabase JWT in the Authorization header.
 */
export async function assessHealthProfile(profileData) {
  const token = await getJWT();

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/assess`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error(`Backend error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Fetch all insurance plans from the backend.
 * No auth required (plans are public).
 */
export async function fetchAllPlans() {
  try {
    const response = await fetch(`${BACKEND_URL}/plans`);
    if (!response.ok) throw new Error('Failed to fetch plans');
    const data = await response.json();
    return data.plans || [];
  } catch (error) {
    console.error('Plans fetch error:', error);
    throw error;
  }
}

/** Health check for the FastAPI backend */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

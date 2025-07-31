import AsyncStorage from '@react-native-async-storage/async-storage';
import { BloomEntry, AbortionEntry, HarvestEntry } from '@/types/farm';

const BLOOM_ENTRIES_KEY = 'bloom_entries';
const ABORTION_ENTRIES_KEY = 'abortion_entries';
const HARVEST_ENTRIES_KEY = 'harvest_entries';
const SETTINGS_KEY = 'app_settings';

export interface AppSettings {
  defaultVariety: 'Red' | 'White' | 'Yellow';
  maturityPeriodDays: number;
  lastSyncDate?: string;
  enableNotifications: boolean;
}

export const defaultSettings: AppSettings = {
  defaultVariety: 'Red',
  maturityPeriodDays: 26,
  enableNotifications: true,
};

// Bloom Entries
export const saveBloomEntry = async (entry: BloomEntry): Promise<void> => {
  try {
    const existingEntries = await getBloomEntries();
    const updatedEntries = [...existingEntries, entry];
    await AsyncStorage.setItem(BLOOM_ENTRIES_KEY, JSON.stringify(updatedEntries));
  } catch (error) {
    console.error('Error saving bloom entry:', error);
    throw error;
  }
};

export const getBloomEntries = async (): Promise<BloomEntry[]> => {
  try {
    const data = await AsyncStorage.getItem(BLOOM_ENTRIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting bloom entries:', error);
    return [];
  }
};

export const updateBloomEntry = async (updatedEntry: BloomEntry): Promise<void> => {
  try {
    const entries = await getBloomEntries();
    const updatedEntries = entries.map(entry => 
      entry.id === updatedEntry.id ? updatedEntry : entry
    );
    await AsyncStorage.setItem(BLOOM_ENTRIES_KEY, JSON.stringify(updatedEntries));
  } catch (error) {
    console.error('Error updating bloom entry:', error);
    throw error;
  }
};

// Abortion Entries
export const saveAbortionEntry = async (entry: AbortionEntry): Promise<void> => {
  try {
    const existingEntries = await getAbortionEntries();
    const updatedEntries = [...existingEntries, entry];
    await AsyncStorage.setItem(ABORTION_ENTRIES_KEY, JSON.stringify(updatedEntries));
  } catch (error) {
    console.error('Error saving abortion entry:', error);
    throw error;
  }
};

export const getAbortionEntries = async (): Promise<AbortionEntry[]> => {
  try {
    const data = await AsyncStorage.getItem(ABORTION_ENTRIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting abortion entries:', error);
    return [];
  }
};

// Harvest Entries
export const saveHarvestEntry = async (entry: HarvestEntry): Promise<void> => {
  try {
    const existingEntries = await getHarvestEntries();
    const updatedEntries = [...existingEntries, entry];
    await AsyncStorage.setItem(HARVEST_ENTRIES_KEY, JSON.stringify(updatedEntries));
  } catch (error) {
    console.error('Error saving harvest entry:', error);
    throw error;
  }
};

export const getHarvestEntries = async (): Promise<HarvestEntry[]> => {
  try {
    const data = await AsyncStorage.getItem(HARVEST_ENTRIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting harvest entries:', error);
    return [];
  }
};

// Settings
export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
  } catch (error) {
    console.error('Error getting settings:', error);
    return defaultSettings;
  }
};

// Utility functions
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([BLOOM_ENTRIES_KEY, ABORTION_ENTRIES_KEY, HARVEST_ENTRIES_KEY]);
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
};
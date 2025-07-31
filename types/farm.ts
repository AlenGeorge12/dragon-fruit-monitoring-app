export interface BloomEntry {
  id: string;
  date: string;
  location: string;
  variety: 'Red' | 'White' | 'Yellow';
  count: number;
  maturityPeriodDays: number;
  imageUri?: string;
  notes?: string;
  createdAt: string;
}

export interface AbortionEntry {
  id: string;
  abortionDate: string;
  bloomEntryId: string;
  abortedCount: number;
  notes?: string;
  imageUri?: string;
  createdAt: string;
}

export interface HarvestEntry {
  id: string;
  harvestDate: string;
  bloomEntryId: string;
  harvestedCount: number;
  notes?: string;
  imageUri?: string;
  createdAt: string;
}

export interface HarvestForecast {
  id: string;
  bloomEntry: BloomEntry;
  expectedHarvestDate: string;
  expectedCount: number;
  totalAborted: number;
  remainingCount: number;
  isReadyToday: boolean;
  daysUntilHarvest: number;
}

export interface FarmLocation {
  id: string;
  type: 'Greenhouse' | 'Trellis' | 'Double Pole';
  zone: 'North' | 'South';
  name: string;
}

export interface DashboardStats {
  todayBlooms: number;
  todayAbortions: number;
  upcomingHarvests: number;
  totalActiveBlooms: number;
  readyToHarvestToday: number;
}
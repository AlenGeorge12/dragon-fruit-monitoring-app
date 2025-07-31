import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, Calendar, MapPin } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { getBloomEntries, getAbortionEntries } from '@/utils/storage';
import { BloomEntry, AbortionEntry } from '@/types/farm';
import { formatDisplayDate } from '@/utils/dateUtils';
import { getLocationById } from '@/utils/farmLocations';

interface HistoryEntry {
  type: 'bloom' | 'abortion';
  data: BloomEntry | AbortionEntry;
  relatedBloom?: BloomEntry;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'bloom' | 'abortion'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'location'>('date');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistoryData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, searchQuery, filterType, sortBy]);

  const loadHistoryData = async () => {
    try {
      const [bloomEntries, abortionEntries] = await Promise.all([
        getBloomEntries(),
        getAbortionEntries()
      ]);

      const historyEntries: HistoryEntry[] = [
        ...bloomEntries.map(bloom => ({
          type: 'bloom' as const,
          data: bloom,
        })),
        ...abortionEntries.map(abortion => {
          const relatedBloom = bloomEntries.find(bloom => bloom.id === abortion.bloomEntryId);
          return {
            type: 'abortion' as const,
            data: abortion,
            relatedBloom,
          };
        }),
      ];

      setEntries(historyEntries);
    } catch (error) {
      console.error('Error loading history data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...entries];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(entry => entry.type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(entry => {
        const searchLower = searchQuery.toLowerCase();
        
        if (entry.type === 'bloom') {
          const bloom = entry.data as BloomEntry;
          const location = getLocationById(bloom.location);
          return (
            bloom.location.toLowerCase().includes(searchLower) ||
            bloom.variety.toLowerCase().includes(searchLower) ||
            (location?.name.toLowerCase().includes(searchLower)) ||
            formatDisplayDate(bloom.date).toLowerCase().includes(searchLower)
          );
        } else {
          const abortion = entry.data as AbortionEntry;
          const bloom = entry.relatedBloom;
          if (!bloom) return false;
          
          const location = getLocationById(bloom.location);
          return (
            bloom.location.toLowerCase().includes(searchLower) ||
            bloom.variety.toLowerCase().includes(searchLower) ||
            (location?.name.toLowerCase().includes(searchLower)) ||
            formatDisplayDate(abortion.abortionDate).toLowerCase().includes(searchLower)
          );
        }
      });
    }

    // Sort entries
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = a.type === 'bloom' 
          ? (a.data as BloomEntry).date 
          : (a.data as AbortionEntry).abortionDate;
        const dateB = b.type === 'bloom' 
          ? (b.data as BloomEntry).date 
          : (b.data as AbortionEntry).abortionDate;
        return new Date(dateB).getTime() - new Date(dateA).getTime(); // Most recent first
      } else {
        const locationA = a.type === 'bloom' 
          ? (a.data as BloomEntry).location 
          : a.relatedBloom?.location || '';
        const locationB = b.type === 'bloom' 
          ? (b.data as BloomEntry).location 
          : b.relatedBloom?.location || '';
        return locationA.localeCompare(locationB);
      }
    });

    setFilteredEntries(filtered);
  };

  const renderHistoryEntry = (entry: HistoryEntry, index: number) => {
    if (entry.type === 'bloom') {
      const bloom = entry.data as BloomEntry;
      const location = getLocationById(bloom.location);
      
      return (
        <Card key={`bloom-${bloom.id}`} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <View style={[styles.typeIndicator, styles.bloomIndicator]} />
            <Text style={styles.entryType}>Bloom Entry</Text>
            <Text style={styles.entryDate}>{formatDisplayDate(bloom.date)}</Text>
          </View>
          <View style={styles.entryContent}>
            <View style={styles.entryRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.entryLocation}>{location?.name || bloom.location}</Text>
            </View>
            <Text style={styles.entryDetails}>
              {bloom.variety} • {bloom.count} flowers
            </Text>
            {bloom.notes && <Text style={styles.entryNotes}>{bloom.notes}</Text>}
          </View>
        </Card>
      );
    } else {
      const abortion = entry.data as AbortionEntry;
      const bloom = entry.relatedBloom;
      
      if (!bloom) return null;
      
      const location = getLocationById(bloom.location);
      
      return (
        <Card key={`abortion-${abortion.id}`} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <View style={[styles.typeIndicator, styles.abortionIndicator]} />
            <Text style={styles.entryType}>Abortion Entry</Text>
            <Text style={styles.entryDate}>{formatDisplayDate(abortion.abortionDate)}</Text>
          </View>
          <View style={styles.entryContent}>
            <View style={styles.entryRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.entryLocation}>{location?.name || bloom.location}</Text>
            </View>
            <Text style={styles.entryDetails}>
              {bloom.variety} • {abortion.abortedCount} aborted
            </Text>
            <Text style={styles.linkedBloom}>
              From bloom on {formatDisplayDate(bloom.date)}
            </Text>
            {abortion.notes && <Text style={styles.entryNotes}>{abortion.notes}</Text>}
          </View>
        </Card>
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>History Viewer</Text>
          <Text style={styles.subtitle}>View all bloom and abortion entries</Text>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Filters & Search</Text>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search entries..."
            />
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filterType}
                  onValueChange={setFilterType}
                  style={styles.picker}
                >
                  <Picker.Item label="All Entries" value="all" />
                  <Picker.Item label="Blooms Only" value="bloom" />
                  <Picker.Item label="Abortions Only" value="abortion" />
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={sortBy}
                  onValueChange={setSortBy}
                  style={styles.picker}
                >
                  <Picker.Item label="Date" value="date" />
                  <Picker.Item label="Location" value="location" />
                </Picker>
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.entriesContainer}>
          <Text style={styles.resultsText}>
            {filteredEntries.length} entries found
          </Text>
          
          {filteredEntries.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>
                {entries.length === 0 
                  ? 'No entries recorded yet. Start by logging some blooms!' 
                  : 'No entries match your current filters.'}
              </Text>
            </Card>
          ) : (
            filteredEntries.map(renderHistoryEntry)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  entriesContainer: {
    paddingHorizontal: 20,
  },
  resultsText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 16,
  },
  entryCard: {
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  bloomIndicator: {
    backgroundColor: '#10B981',
  },
  abortionIndicator: {
    backgroundColor: '#EF4444',
  },
  entryType: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    flex: 1,
  },
  entryDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  entryContent: {
    gap: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryLocation: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  entryDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  linkedBloom: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8B5CF6',
    fontStyle: 'italic',
  },
  entryNotes: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    fontStyle: 'italic',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    padding: 20,
  },
});
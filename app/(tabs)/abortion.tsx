import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Circle as XCircle, Save, Search } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { getBloomEntries, getAbortionEntries, saveAbortionEntry } from '@/utils/storage';
import { BloomEntry, AbortionEntry } from '@/types/farm';
import { formatDate, formatDisplayDate } from '@/utils/dateUtils';
import { getLocationById } from '@/utils/farmLocations';
import { router } from 'expo-router';

export default function AbortionPage() {
  const [abortionDate, setAbortionDate] = useState(formatDate(new Date()));
  const [bloomEntries, setBloomEntries] = useState<BloomEntry[]>([]);
  const [filteredBlooms, setFilteredBlooms] = useState<BloomEntry[]>([]);
  const [selectedBloom, setSelectedBloom] = useState<BloomEntry | null>(null);
  const [abortedCount, setAbortedCount] = useState('1');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBloomEntries();
  }, []);

  useEffect(() => {
    filterBlooms();
  }, [bloomEntries, searchQuery]);

  const loadBloomEntries = async () => {
    try {
      const [blooms, abortions] = await Promise.all([
        getBloomEntries(),
        getAbortionEntries()
      ]);

      // Calculate remaining counts for each bloom
      const bloomsWithRemaining = blooms.map(bloom => {
        const totalAborted = abortions
          .filter(abortion => abortion.bloomEntryId === bloom.id)
          .reduce((sum, abortion) => sum + abortion.abortedCount, 0);
        
        return {
          ...bloom,
          remainingCount: bloom.count - totalAborted,
        };
      }).filter(bloom => bloom.remainingCount > 0); // Only show blooms with remaining flowers

      setBloomEntries(bloomsWithRemaining);
    } catch (error) {
      console.error('Error loading bloom entries:', error);
    }
  };

  const filterBlooms = () => {
    if (!searchQuery.trim()) {
      setFilteredBlooms(bloomEntries);
      return;
    }

    const filtered = bloomEntries.filter(bloom => 
      bloom.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bloom.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatDisplayDate(bloom.date).toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredBlooms(filtered);
  };

  const handleSelectBloom = (bloom: BloomEntry) => {
    setSelectedBloom(bloom);
    setAbortedCount('1');
  };

  const handleSave = async () => {
    if (!selectedBloom) {
      Alert.alert('Validation Error', 'Please select a bloom entry');
      return;
    }

    const countNum = parseInt(abortedCount);
    if (isNaN(countNum) || countNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid abortion count');
      return;
    }

    if (countNum > (selectedBloom as any).remainingCount) {
      Alert.alert('Validation Error', `Cannot abort more than ${(selectedBloom as any).remainingCount} remaining flowers`);
      return;
    }

    setLoading(true);

    try {
      const entry: AbortionEntry = {
        id: Date.now().toString(),
        abortionDate,
        bloomEntryId: selectedBloom.id,
        abortedCount: countNum,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
      };

      await saveAbortionEntry(entry);
      
      Alert.alert('Success', 'Abortion entry saved successfully', [
        {
          text: 'Add Another',
          onPress: () => {
            setSelectedBloom(null);
            setAbortedCount('1');
            setNotes('');
            loadBloomEntries();
          }
        },
        {
          text: 'Go to Dashboard',
          onPress: () => router.push('/')
        }
      ]);
    } catch (error) {
      console.error('Error saving abortion entry:', error);
      Alert.alert('Error', 'Failed to save abortion entry');
    } finally {
      setLoading(false);
    }
  };

  const renderBloomItem = (bloom: BloomEntry & { remainingCount: number }) => {
    const location = getLocationById(bloom.location);
    
    return (
      <TouchableOpacity
        key={bloom.id}
        style={[
          styles.bloomItem,
          selectedBloom?.id === bloom.id && styles.selectedBloomItem
        ]}
        onPress={() => handleSelectBloom(bloom)}
      >
        <View style={styles.bloomHeader}>
          <Text style={styles.bloomLocation}>{location?.name || bloom.location}</Text>
          <Text style={styles.bloomDate}>{formatDisplayDate(bloom.date)}</Text>
        </View>
        <View style={styles.bloomDetails}>
          <Text style={styles.bloomVariety}>{bloom.variety}</Text>
          <Text style={styles.bloomCount}>
            {bloom.remainingCount} of {bloom.count} remaining
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Log Aborted Flowers</Text>
          <Text style={styles.subtitle}>Record flower abortions and link to original blooms</Text>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Abortion Details</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Abortion Date</Text>
            <TextInput
              style={styles.input}
              value={abortionDate}
              onChangeText={setAbortionDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Select Original Bloom</Text>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by location, variety, or date..."
            />
          </View>

          <ScrollView style={styles.bloomList} nestedScrollEnabled>
            {filteredBlooms.length === 0 ? (
              <Text style={styles.emptyText}>
                {bloomEntries.length === 0 
                  ? 'No bloom entries available. Log some blooms first.' 
                  : 'No blooms match your search.'}
              </Text>
            ) : (
              filteredBlooms.map(renderBloomItem)
            )}
          </ScrollView>
        </Card>

        {selectedBloom && (
          <Card>
            <Text style={styles.sectionTitle}>Abortion Count & Notes</Text>
            
            <View style={styles.selectedBloomInfo}>
              <Text style={styles.selectedBloomText}>
                Selected: {getLocationById(selectedBloom.location)?.name} - {selectedBloom.variety}
              </Text>
              <Text style={styles.selectedBloomCount}>
                Max abortable: {(selectedBloom as any).remainingCount}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Aborted Count</Text>
              <TextInput
                style={styles.input}
                value={abortedCount}
                onChangeText={setAbortedCount}
                placeholder="Number of aborted flowers"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Reason for abortion (e.g., heat stress, disease)..."
                multiline
                numberOfLines={3}
              />
            </View>
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            title="Save Abortion Entry"
            onPress={handleSave}
            disabled={loading || !selectedBloom}
            style={styles.saveButton}
          />
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
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  bloomList: {
    maxHeight: 300,
  },
  bloomItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  selectedBloomItem: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  bloomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bloomLocation: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    flex: 1,
  },
  bloomDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  bloomDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bloomVariety: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
  },
  bloomCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    padding: 20,
  },
  selectedBloomInfo: {
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedBloomText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  selectedBloomCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    marginTop: 4,
  },
  actions: {
    padding: 20,
  },
  saveButton: {
    width: '100%',
  },
});
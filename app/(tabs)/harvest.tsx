import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Calendar, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Camera, Save } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { getBloomEntries, getAbortionEntries, getHarvestEntries, saveHarvestEntry } from '@/utils/storage';
import { BloomEntry, AbortionEntry, HarvestEntry, HarvestForecast } from '@/types/farm';
import { formatDate, addDays, formatDisplayDate, daysBetween } from '@/utils/dateUtils';
import { getLocationById } from '@/utils/farmLocations';
import { router } from 'expo-router';

export default function HarvestPage() {
  const [harvestForecasts, setHarvestForecasts] = useState<HarvestForecast[]>([]);
  const [selectedBloom, setSelectedBloom] = useState<BloomEntry | null>(null);
  const [harvestDate, setHarvestDate] = useState(formatDate(new Date()));
  const [harvestedCount, setHarvestedCount] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showHarvestForm, setShowHarvestForm] = useState(false);

  useEffect(() => {
    loadHarvestData();
  }, []);

  const loadHarvestData = async () => {
    try {
      const [bloomEntries, abortionEntries, harvestEntries] = await Promise.all([
        getBloomEntries(),
        getAbortionEntries(),
        getHarvestEntries()
      ]);

      const today = formatDate(new Date());
      
      const forecasts: HarvestForecast[] = bloomEntries
        .map(bloom => {
          const expectedHarvestDate = formatDate(addDays(new Date(bloom.date), bloom.maturityPeriodDays));
          const totalAborted = abortionEntries
            .filter(abortion => abortion.bloomEntryId === bloom.id)
            .reduce((sum, abortion) => sum + abortion.abortedCount, 0);
          
          const totalHarvested = harvestEntries
            .filter(harvest => harvest.bloomEntryId === bloom.id)
            .reduce((sum, harvest) => sum + harvest.harvestedCount, 0);
          
          const remainingCount = bloom.count - totalAborted - totalHarvested;
          const daysUntilHarvest = daysBetween(today, expectedHarvestDate);
          const isReadyToday = expectedHarvestDate === today;
          
          return {
            id: bloom.id,
            bloomEntry: bloom,
            expectedHarvestDate,
            expectedCount: bloom.count,
            totalAborted,
            remainingCount,
            isReadyToday,
            daysUntilHarvest: expectedHarvestDate >= today ? daysUntilHarvest : -daysUntilHarvest,
          };
        })
        .filter(forecast => forecast.remainingCount > 0)
        .sort((a, b) => {
          // Sort by: ready today first, then by days until harvest
          if (a.isReadyToday && !b.isReadyToday) return -1;
          if (!a.isReadyToday && b.isReadyToday) return 1;
          return a.daysUntilHarvest - b.daysUntilHarvest;
        });

      setHarvestForecasts(forecasts);
    } catch (error) {
      console.error('Error loading harvest data:', error);
    }
  };

  const handleSelectBloom = (bloom: BloomEntry) => {
    setSelectedBloom(bloom);
    setShowHarvestForm(true);
    
    const forecast = harvestForecasts.find(f => f.id === bloom.id);
    if (forecast) {
      setHarvestedCount(forecast.remainingCount.toString());
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSaveHarvest = async () => {
    if (!selectedBloom) {
      Alert.alert('Error', 'No bloom selected');
      return;
    }

    const countNum = parseInt(harvestedCount);
    if (isNaN(countNum) || countNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid harvest count');
      return;
    }

    const forecast = harvestForecasts.find(f => f.id === selectedBloom.id);
    if (forecast && countNum > forecast.remainingCount) {
      Alert.alert('Validation Error', `Cannot harvest more than ${forecast.remainingCount} remaining fruits`);
      return;
    }

    setLoading(true);

    try {
      const entry: HarvestEntry = {
        id: Date.now().toString(),
        harvestDate,
        bloomEntryId: selectedBloom.id,
        harvestedCount: countNum,
        notes: notes || undefined,
        imageUri: imageUri || undefined,
        createdAt: new Date().toISOString(),
      };

      await saveHarvestEntry(entry);
      
      Alert.alert('Success', 'Harvest recorded successfully', [
        {
          text: 'Record Another',
          onPress: () => {
            setSelectedBloom(null);
            setShowHarvestForm(false);
            setHarvestedCount('');
            setNotes('');
            setImageUri('');
            loadHarvestData();
          }
        },
        {
          text: 'Go to Dashboard',
          onPress: () => router.push('/')
        }
      ]);
    } catch (error) {
      console.error('Error saving harvest entry:', error);
      Alert.alert('Error', 'Failed to save harvest entry');
    } finally {
      setLoading(false);
    }
  };

  const renderHarvestForecast = (forecast: HarvestForecast) => {
    const location = getLocationById(forecast.bloomEntry.location);
    
    return (
      <TouchableOpacity
        key={forecast.id}
        style={[
          styles.forecastCard,
          forecast.isReadyToday && styles.readyTodayCard,
          forecast.daysUntilHarvest < 0 && styles.overdueCard
        ]}
        onPress={() => handleSelectBloom(forecast.bloomEntry)}
      >
        <View style={styles.forecastHeader}>
          <View style={styles.statusIndicator}>
            {forecast.isReadyToday ? (
              <AlertCircle size={20} color="#F59E0B" />
            ) : forecast.daysUntilHarvest < 0 ? (
              <AlertCircle size={20} color="#EF4444" />
            ) : (
              <Calendar size={20} color="#6B7280" />
            )}
            <Text style={[
              styles.statusText,
              forecast.isReadyToday && styles.readyTodayText,
              forecast.daysUntilHarvest < 0 && styles.overdueText
            ]}>
              {forecast.isReadyToday 
                ? 'Ready Today!' 
                : forecast.daysUntilHarvest < 0 
                  ? `Overdue by ${Math.abs(forecast.daysUntilHarvest)} days`
                  : `${forecast.daysUntilHarvest} days to go`
              }
            </Text>
          </View>
          <Text style={styles.harvestDate}>
            {formatDisplayDate(forecast.expectedHarvestDate)}
          </Text>
        </View>
        
        <View style={styles.forecastContent}>
          <Text style={styles.locationName}>
            {location?.name || forecast.bloomEntry.location}
          </Text>
          <Text style={styles.bloomDetails}>
            {forecast.bloomEntry.variety} • Bloomed {formatDisplayDate(forecast.bloomEntry.date)}
          </Text>
          <Text style={styles.countDetails}>
            {forecast.remainingCount} fruits ready to harvest
          </Text>
          {forecast.totalAborted > 0 && (
            <Text style={styles.abortedText}>
              ({forecast.totalAborted} aborted from original {forecast.expectedCount})
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const readyToday = harvestForecasts.filter(f => f.isReadyToday);
  const upcoming = harvestForecasts.filter(f => f.daysUntilHarvest > 0);
  const overdue = harvestForecasts.filter(f => f.daysUntilHarvest < 0);

  if (showHarvestForm && selectedBloom) {
    const forecast = harvestForecasts.find(f => f.id === selectedBloom.id);
    const location = getLocationById(selectedBloom.location);
    
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>Record Harvest</Text>
            <Text style={styles.subtitle}>Log harvested fruits for this bloom</Text>
          </View>

          <Card>
            <Text style={styles.sectionTitle}>Selected Bloom</Text>
            <View style={styles.selectedBloomInfo}>
              <Text style={styles.selectedBloomLocation}>
                {location?.name || selectedBloom.location}
              </Text>
              <Text style={styles.selectedBloomDetails}>
                {selectedBloom.variety} • Bloomed {formatDisplayDate(selectedBloom.date)}
              </Text>
              <Text style={styles.selectedBloomCount}>
                {forecast?.remainingCount} fruits available to harvest
              </Text>
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Harvest Details</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Harvest Date</Text>
              <TextInput
                style={styles.input}
                value={harvestDate}
                onChangeText={setHarvestDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Harvested Count</Text>
              <TextInput
                style={styles.input}
                value={harvestedCount}
                onChangeText={setHarvestedCount}
                placeholder="Number of fruits harvested"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Quality notes, issues, etc..."
                multiline
                numberOfLines={3}
              />
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Photo Documentation</Text>
            
            <Button
              title={imageUri ? "Retake Photo" : "Take Photo"}
              onPress={handleTakePhoto}
              variant="secondary"
              style={styles.photoButton}
            />
            
            {imageUri && (
              <View style={styles.imagePreview}>
                <Camera size={48} color="#10B981" />
                <Text style={styles.imageText}>Photo captured</Text>
              </View>
            )}
          </Card>

          <View style={styles.actions}>
            <Button
              title="Cancel"
              onPress={() => {
                setShowHarvestForm(false);
                setSelectedBloom(null);
                setHarvestedCount('');
                setNotes('');
                setImageUri('');
              }}
              variant="secondary"
              style={styles.actionButton}
            />
            <Button
              title="Save Harvest"
              onPress={handleSaveHarvest}
              disabled={loading}
              style={styles.actionButton}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Harvest Management</Text>
          <Text style={styles.subtitle}>Track and record your dragon fruit harvests</Text>
        </View>

        {readyToday.length > 0 && (
          <Card>
            <View style={styles.sectionHeader}>
              <AlertCircle size={24} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Ready to Harvest Today</Text>
            </View>
            {readyToday.map(renderHarvestForecast)}
          </Card>
        )}

        {overdue.length > 0 && (
          <Card>
            <View style={styles.sectionHeader}>
              <AlertCircle size={24} color="#EF4444" />
              <Text style={styles.sectionTitle}>Overdue Harvests</Text>
            </View>
            {overdue.map(renderHarvestForecast)}
          </Card>
        )}

        {upcoming.length > 0 && (
          <Card>
            <View style={styles.sectionHeader}>
              <Calendar size={24} color="#6B7280" />
              <Text style={styles.sectionTitle}>Upcoming Harvests</Text>
            </View>
            {upcoming.slice(0, 10).map(renderHarvestForecast)}
          </Card>
        )}

        {harvestForecasts.length === 0 && (
          <Card>
            <Text style={styles.emptyText}>
              No harvests scheduled. Start by logging some bloom entries!
            </Text>
          </Card>
        )}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginLeft: 8,
  },
  forecastCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  readyTodayCard: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  overdueCard: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginLeft: 8,
  },
  readyTodayText: {
    color: '#F59E0B',
  },
  overdueText: {
    color: '#EF4444',
  },
  harvestDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  forecastContent: {
    gap: 4,
  },
  locationName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  bloomDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  countDetails: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  abortedText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  selectedBloomInfo: {
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedBloomLocation: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  selectedBloomDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    marginTop: 4,
  },
  selectedBloomCount: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
    marginTop: 4,
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
  photoButton: {
    marginBottom: 16,
  },
  imagePreview: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  imageText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  actionButton: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    padding: 20,
  },
});
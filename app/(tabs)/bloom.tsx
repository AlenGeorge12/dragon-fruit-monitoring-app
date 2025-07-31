import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Camera, Save, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { saveBloomEntry, getSettings } from '@/utils/storage';
import { BloomEntry } from '@/types/farm';
import { formatDate } from '@/utils/dateUtils';
import { getAllFarmLocations, getLocationsByType } from '@/utils/farmLocations';
import { router } from 'expo-router';

export default function BloomPage() {
  const [date, setDate] = useState(formatDate(new Date()));
  const [locationType, setLocationType] = useState<'Greenhouse' | 'Trellis' | 'Double Pole'>('Greenhouse');
  const [location, setLocation] = useState('');
  const [variety, setVariety] = useState<'Red' | 'White' | 'Yellow'>('Red');
  const [count, setCount] = useState('1');
  const [maturityPeriodDays, setMaturityPeriodDays] = useState('26');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string>('');
  const [loading, setSLoading] = useState(false);

  const locations = getLocationsByType(locationType);

  useEffect(() => {
    loadDefaultSettings();
  }, []);

  useEffect(() => {
    setLocation(''); // Reset location when type changes
  }, [locationType]);

  const loadDefaultSettings = async () => {
    try {
      const settings = await getSettings();
      setVariety(settings.defaultVariety);
      setMaturityPeriodDays(settings.maturityPeriodDays.toString());
    } catch (error) {
      console.error('Error loading settings:', error);
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

  const handleSave = async () => {
    if (!location) {
      Alert.alert('Validation Error', 'Please select a location');
      return;
    }

    const countNum = parseInt(count);
    if (isNaN(countNum) || countNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid count');
      return;
    }

    const maturityDays = parseInt(maturityPeriodDays);
    if (isNaN(maturityDays) || maturityDays <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid maturity period');
      return;
    }

    setSLoading(true);

    try {
      const entry: BloomEntry = {
        id: Date.now().toString(),
        date,
        location,
        variety,
        count: countNum,
        maturityPeriodDays: maturityDays,
        imageUri: imageUri || undefined,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
      };

      await saveBloomEntry(entry);
      
      Alert.alert('Success', 'Bloom entry saved successfully', [
        {
          text: 'Add Another',
          onPress: () => {
            setCount('1');
            setMaturityPeriodDays('26');
            setNotes('');
            setImageUri('');
          }
        },
        {
          text: 'Go to Dashboard',
          onPress: () => router.push('/')
        }
      ]);
    } catch (error) {
      console.error('Error saving bloom entry:', error);
      Alert.alert('Error', 'Failed to save bloom entry');
    } finally {
      setSLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Log Flower Bloom</Text>
          <Text style={styles.subtitle}>Record new flower blooms on your farm</Text>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Bloom Details</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Location Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={locationType}
                onValueChange={setLocationType}
                style={styles.picker}
              >
                <Picker.Item label="Greenhouse" value="Greenhouse" />
                <Picker.Item label="Trellis" value="Trellis" />
                <Picker.Item label="Double Pole" value="Double Pole" />
              </Picker>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Specific Location</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={location}
                onValueChange={setLocation}
                style={styles.picker}
                enabled={locations.length > 0}
              >
                <Picker.Item label="Select location..." value="" />
                {locations.map(loc => (
                  <Picker.Item key={loc.id} label={loc.name} value={loc.id} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Variety</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={variety}
                onValueChange={setVariety}
                style={styles.picker}
              >
                <Picker.Item label="Red" value="Red" />
                <Picker.Item label="White" value="White" />
                <Picker.Item label="Yellow" value="Yellow" />
              </Picker>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Flower Count</Text>
            <TextInput
              style={styles.input}
              value={count}
              onChangeText={setCount}
              placeholder="Number of flowers"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Maturity Period (Days)</Text>
            <TextInput
              style={styles.input}
              value={maturityPeriodDays}
              onChangeText={setMaturityPeriodDays}
              placeholder="Days until harvest ready"
              keyboardType="numeric"
            />
            <Text style={styles.fieldHint}>
              Number of days from bloom to harvest readiness
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes..."
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
              <ImageIcon size={48} color="#10B981" />
              <Text style={styles.imageText}>Photo captured</Text>
            </View>
          )}
        </Card>

        <View style={styles.actions}>
          <Button
            title="Save Bloom Entry"
            onPress={handleSave}
            disabled={loading}
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
  fieldHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 50,
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
    padding: 20,
  },
  saveButton: {
    width: '100%',
  },
});
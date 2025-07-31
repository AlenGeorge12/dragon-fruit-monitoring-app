import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Upload, Download, Trash2, RefreshCw } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { getSettings, saveSettings, clearAllData, getBloomEntries, getAbortionEntries } from '@/utils/storage';
import { AppSettings } from '@/utils/storage';
import { formatDate } from '@/utils/dateUtils';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    defaultVariety: 'Red',
    maturityPeriodDays: 26,
    enableNotifications: true,
  });
  const [totalBlooms, setTotalBlooms] = useState(0);
  const [totalAbortions, setTotalAbortions] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadDataStats();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadDataStats = async () => {
    try {
      const [blooms, abortions] = await Promise.all([
        getBloomEntries(),
        getAbortionEntries()
      ]);
      setTotalBlooms(blooms.length);
      setTotalAbortions(abortions.length);
    } catch (error) {
      console.error('Error loading data stats:', error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await saveSettings(settings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const [blooms, abortions] = await Promise.all([
        getBloomEntries(),
        getAbortionEntries()
      ]);
      
      const exportData = {
        blooms,
        abortions,
        exportDate: new Date().toISOString(),
        settings,
      };

      // In a real app, this would save to device storage or upload to cloud
      console.log('Export data:', exportData);
      Alert.alert(
        'Export Complete', 
        `Exported ${blooms.length} bloom entries and ${abortions.length} abortion entries.\n\nIn a production app, this would save to your device or sync to Google Drive.`
      );

      // Update last sync date
      const updatedSettings = { ...settings, lastSyncDate: formatDate(new Date()) };
      setSettings(updatedSettings);
      await saveSettings(updatedSettings);
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all bloom and abortion entries. This action cannot be undone.\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              setTotalBlooms(0);
              setTotalAbortions(0);
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          }
        }
      ]
    );
  };

  const handleSimulateSync = async () => {
    setLoading(true);
    
    // Simulate sync delay
    setTimeout(async () => {
      try {
        const updatedSettings = { ...settings, lastSyncDate: formatDate(new Date()) };
        setSettings(updatedSettings);
        await saveSettings(updatedSettings);
        Alert.alert('Sync Complete', 'Data has been synced to Google Drive');
      } catch (error) {
        Alert.alert('Sync Failed', 'Unable to sync data. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Configure app preferences and data sync</Text>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Default Settings</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Default Variety</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={settings.defaultVariety}
                onValueChange={(value) => setSettings({ ...settings, defaultVariety: value })}
                style={styles.picker}
              >
                <Picker.Item label="Red" value="Red" />
                <Picker.Item label="White" value="White" />
                <Picker.Item label="Yellow" value="Yellow" />
              </Picker>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Maturity Period (Days)</Text>
            <TextInput
              style={styles.input}
              value={settings.maturityPeriodDays.toString()}
              onChangeText={(value) => {
                const days = parseInt(value) || 26;
                setSettings({ ...settings, maturityPeriodDays: days });
              }}
              placeholder="26"
              keyboardType="numeric"
            />
            <Text style={styles.fieldHint}>
              Number of days from bloom to harvest readiness
            </Text>
          </View>

          <Button
            title="Save Settings"
            onPress={handleSaveSettings}
            disabled={loading}
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Data Summary</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalBlooms}</Text>
              <Text style={styles.statLabel}>Bloom Entries</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalAbortions}</Text>
              <Text style={styles.statLabel}>Abortion Entries</Text>
            </View>
          </View>

          {settings.lastSyncDate && (
            <Text style={styles.lastSync}>
              Last sync: {settings.lastSyncDate}
            </Text>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <View style={styles.actionButtons}>
            <Button
              title="Sync to Google Drive"
              onPress={handleSimulateSync}
              disabled={loading}
              style={styles.actionButton}
            />
            
            <Button
              title="Export Data"
              onPress={handleExportData}
              variant="secondary"
              style={styles.actionButton}
            />
            
            <Button
              title="Clear All Data"
              onPress={handleClearData}
              variant="danger"
              style={styles.actionButton}
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>
            Dragon Fruit Bloom Tracker v1.0{'\n'}
            Built for professional dragon fruit cultivation{'\n'}
            Offline-first design for reliable field use
          </Text>
        </Card>
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 50,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  lastSync: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    width: '100%',
  },
  aboutText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
});
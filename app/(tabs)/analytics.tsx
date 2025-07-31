import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Card } from '@/components/Card';
import { getBloomEntries, getAbortionEntries, getSettings } from '@/utils/storage';
import { BloomEntry, AbortionEntry } from '@/types/farm';
import { formatDate, addDays, formatDisplayDate } from '@/utils/dateUtils';
import { getLocationById } from '@/utils/farmLocations';

// Conditionally import Victory components only for native platforms
let VictoryChart: any, VictoryBar: any, VictoryAxis: any, VictoryTheme: any;

if (Platform.OS !== 'web') {
  const Victory = require('victory-native');
  VictoryChart = Victory.VictoryChart;
  VictoryBar = Victory.VictoryBar;
  VictoryAxis = Victory.VictoryAxis;
  VictoryTheme = Victory.VictoryTheme;
}

const screenWidth = Dimensions.get('window').width;

interface ChartData {
  x: string;
  y: number;
  label?: string;
}

interface AbortionRateData {
  location: string;
  rate: number;
  total: number;
  aborted: number;
}

export default function AnalyticsPage() {
  const [harvestData, setHarvestData] = useState<ChartData[]>([]);
  const [abortionByLocation, setAbortionByLocation] = useState<AbortionRateData[]>([]);
  const [abortionByVariety, setAbortionByVariety] = useState<ChartData[]>([]);
  const [timeRange, setTimeRange] = useState('7'); // days
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      const [bloomEntries, abortionEntries, settings] = await Promise.all([
        getBloomEntries(),
        getAbortionEntries(),
        getSettings()
      ]);

      // Generate harvest forecast data
      const days = parseInt(timeRange);
      const harvestForecast: ChartData[] = [];
      
      for (let i = 0; i < days; i++) {
        const targetDate = formatDate(addDays(new Date(), i));
        
        const expectedHarvests = bloomEntries
          .filter(bloom => {
            const harvestDate = formatDate(addDays(new Date(bloom.date), bloom.maturityPeriodDays));
            return harvestDate === targetDate;
          })
          .reduce((sum, bloom) => {
            const totalAborted = abortionEntries
              .filter(abortion => abortion.bloomEntryId === bloom.id)
              .reduce((abortSum, abortion) => abortSum + abortion.abortedCount, 0);
            return sum + (bloom.count - totalAborted);
          }, 0);

        harvestForecast.push({
          x: formatDisplayDate(targetDate).split(',')[0], // Short date
          y: expectedHarvests,
        });
      }

      setHarvestData(harvestForecast);

      // Calculate abortion rates by location
      const locationStats = new Map<string, { total: number; aborted: number }>();
      
      bloomEntries.forEach(bloom => {
        const current = locationStats.get(bloom.location) || { total: 0, aborted: 0 };
        current.total += bloom.count;
        locationStats.set(bloom.location, current);
      });

      abortionEntries.forEach(abortion => {
        const bloom = bloomEntries.find(b => b.id === abortion.bloomEntryId);
        if (bloom) {
          const current = locationStats.get(bloom.location) || { total: 0, aborted: 0 };
          current.aborted += abortion.abortedCount;
          locationStats.set(bloom.location, current);
        }
      });

      const locationRates: AbortionRateData[] = Array.from(locationStats.entries())
        .map(([location, stats]) => ({
          location,
          rate: stats.total > 0 ? (stats.aborted / stats.total) * 100 : 0,
          total: stats.total,
          aborted: stats.aborted,
        }))
        .filter(item => item.total > 0)
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 10); // Top 10 locations

      setAbortionByLocation(locationRates);

      // Calculate abortion rates by variety
      const varietyStats = new Map<string, { total: number; aborted: number }>();
      
      bloomEntries.forEach(bloom => {
        const current = varietyStats.get(bloom.variety) || { total: 0, aborted: 0 };
        current.total += bloom.count;
        varietyStats.set(bloom.variety, current);
      });

      abortionEntries.forEach(abortion => {
        const bloom = bloomEntries.find(b => b.id === abortion.bloomEntryId);
        if (bloom) {
          const current = varietyStats.get(bloom.variety) || { total: 0, aborted: 0 };
          current.aborted += abortion.abortedCount;
          varietyStats.set(bloom.variety, current);
        }
      });

      const varietyRates: ChartData[] = Array.from(varietyStats.entries())
        .map(([variety, stats]) => ({
          x: variety,
          y: stats.total > 0 ? (stats.aborted / stats.total) * 100 : 0,
        }))
        .filter(item => item.y > 0)
        .sort((a, b) => b.y - a.y)
        .slice(0, 10);

      setAbortionByVariety(varietyRates);

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Farm Analytics</Text>
          <Text style={styles.subtitle}>Production insights and trends</Text>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={timeRange}
              onValueChange={setTimeRange}
              style={styles.picker}
            >
              <Picker.Item label="Next 7 days" value="7" />
              <Picker.Item label="Next 14 days" value="14" />
              <Picker.Item label="Next 30 days" value="30" />
            </Picker>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Expected Daily Harvest</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartPlaceholderText}>
                Charts are available on mobile devices
              </Text>
              <View style={styles.dataList}>
                {harvestData.map((item, index) => (
                  <View key={index} style={styles.dataItem}>
                    <Text style={styles.dataLabel}>{item.x}</Text>
                    <Text style={styles.dataValue}>{item.y} fruits</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            VictoryChart && (
              <VictoryChart
                theme={VictoryTheme.material}
                width={screenWidth - 80}
                height={250}
                padding={{ left: 60, top: 20, right: 40, bottom: 60 }}
              >
                <VictoryAxis dependentAxis />
                <VictoryAxis style={{ tickLabels: { angle: -45 } }} />
                <VictoryBar
                  data={harvestData}
                  style={{
                    data: { fill: "#10B981" }
                  }}
                />
              </VictoryChart>
            )
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Abortion Rate by Variety</Text>
          {abortionByVariety.length > 0 ? (
            Platform.OS === 'web' ? (
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>
                  Charts are available on mobile devices
                </Text>
                <View style={styles.dataList}>
                  {abortionByVariety.map((item, index) => (
                    <View key={index} style={styles.dataItem}>
                      <Text style={styles.dataLabel}>{item.x}</Text>
                      <Text style={styles.dataValue}>{item.y.toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              VictoryChart && (
                <VictoryChart
                  theme={VictoryTheme.material}
                  width={screenWidth - 80}
                  height={200}
                  padding={{ left: 60, top: 20, right: 40, bottom: 60 }}
                >
                  <VictoryAxis dependentAxis tickFormat={(y: number) => `${y}%`} />
                  <VictoryAxis />
                  <VictoryBar
                    data={abortionByVariety}
                    style={{
                      data: { fill: "#EF4444" }
                    }}
                  />
                </VictoryChart>
              )
            )
          ) : (
            <Text style={styles.noDataText}>No abortion data available</Text>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Top Abortion Rates by Location</Text>
          {abortionByLocation.length > 0 ? (
            abortionByLocation.slice(0, 5).map((item, index) => {
              const location = getLocationById(item.location);
              return (
                <View key={item.location} style={styles.locationItem}>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>
                      {location?.name || item.location}
                    </Text>
                    <Text style={styles.locationStats}>
                      {item.aborted} of {item.total} aborted
                    </Text>
                  </View>
                  <View style={styles.rateContainer}>
                    <Text style={[styles.rate, { color: item.rate > 20 ? '#EF4444' : item.rate > 10 ? '#F59E0B' : '#10B981' }]}>
                      {item.rate.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.noDataText}>No location data available</Text>
          )}
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 50,
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
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    padding: 20,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  locationStats: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  rateContainer: {
    alignItems: 'flex-end',
  },
  rate: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  chartPlaceholder: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  dataList: {
    width: '100%',
  },
  dataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
    borderRadius: 4,
  },
  dataLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  dataValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
});
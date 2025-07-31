import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Flower, Circle as XCircle, Calendar, TrendingUp } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { getBloomEntries, getAbortionEntries, getSettings } from '@/utils/storage';
import { BloomEntry, AbortionEntry, DashboardStats } from '@/types/farm';
import { formatDate, addDays, isToday, formatDisplayDate } from '@/utils/dateUtils';
import { router } from 'expo-router';

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayBlooms: 0,
    todayAbortions: 0,
    upcomingHarvests: 0,
    totalActiveBlooms: 0,
  });
  const [upcomingHarvests, setUpcomingHarvests] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('Never');

  const loadDashboardData = async () => {
    try {
      const [bloomEntries, abortionEntries, settings] = await Promise.all([
        getBloomEntries(),
        getAbortionEntries(),
        getHarvestEntries(),
        getSettings()
      ]);

      const today = formatDate(new Date());
      
      // Calculate stats
      const todayBlooms = bloomEntries.filter(entry => entry.date === today).length;
      const todayAbortions = abortionEntries.filter(entry => entry.abortionDate === today).length;
      
      // Calculate ready to harvest today
      const readyToHarvestToday = bloomEntries.filter(bloom => {
        const harvestDate = formatDate(addDays(new Date(bloom.date), bloom.maturityPeriodDays));
        return harvestDate === today;
      }).length;
      
      // Calculate upcoming harvests (next 7 days)
      const upcoming = bloomEntries
        .map(bloom => {
          const harvestDate = addDays(new Date(bloom.date), bloom.maturityPeriodDays);
          const totalAborted = abortionEntries
            .filter(abortion => abortion.bloomEntryId === bloom.id)
            .reduce((sum, abortion) => sum + abortion.abortedCount, 0);
          
          return {
            bloom,
            harvestDate: formatDate(harvestDate),
            remainingCount: bloom.count - totalAborted,
          };
        })
        .filter(item => {
          const harvestDate = new Date(item.harvestDate);
          const nextWeek = addDays(new Date(), 7);
          return harvestDate <= nextWeek && harvestDate >= new Date() && item.remainingCount > 0;
        })
        .sort((a, b) => new Date(a.harvestDate).getTime() - new Date(b.harvestDate).getTime());

      const upcomingHarvests = upcoming.length;
      const totalActiveBlooms = bloomEntries.reduce((sum, bloom) => {
        const totalAborted = abortionEntries
          .filter(abortion => abortion.bloomEntryId === bloom.id)
          .reduce((sum, abortion) => sum + abortion.abortedCount, 0);
        return sum + (bloom.count - totalAborted);
      }, 0);

      setStats({
        todayBlooms,
        todayAbortions,
        upcomingHarvests,
        totalActiveBlooms,
        readyToHarvestToday,
      });

      setUpcomingHarvests(upcoming.slice(0, 5)); // Show next 5 harvests
      
      if (settings.lastSyncDate) {
        setLastSync(formatDisplayDate(settings.lastSyncDate));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dragon Fruit Farm</Text>
          <Text style={styles.subtitle}>Bloom Tracker Dashboard</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            <StatCard
              title="Today's Blooms"
              value={stats.todayBlooms}
              icon={Flower}
              color="#10B981"
            />
            <StatCard
              title="Abortions Today"
              value={stats.todayAbortions}
              icon={XCircle}
              color="#EF4444"
            />
          </View>
          <View style={styles.statRow}>
            <StatCard
              title="Ready to Harvest"
              value={stats.readyToHarvestToday}
              icon={Calendar}
              color="#F59E0B"
              subtitle="Today"
            />
            <StatCard
              title="Active Blooms"
              value={stats.totalActiveBlooms}
              icon={TrendingUp}
              color="#8B5CF6"
            />
          </View>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <Button
              title="Log New Bloom"
              onPress={() => router.push('/bloom')}
              style={styles.actionButton}
            />
            <Button
              title="Record Harvest"
              onPress={() => router.push('/harvest')}
              variant="secondary"
              style={styles.actionButton}
            />
          </View>
        </Card>

        {upcomingHarvests.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Upcoming Harvests</Text>
            {upcomingHarvests.map((harvest, index) => (
              <View key={index} style={styles.harvestItem}>
                <View style={styles.harvestInfo}>
                  <Text style={styles.harvestLocation}>{harvest.bloom.location}</Text>
                  <Text style={styles.harvestDetails}>
                    {harvest.bloom.variety} • {harvest.remainingCount} fruits
                  </Text>
                </View>
                <Text style={styles.harvestDate}>
                  {formatDisplayDate(harvest.harvestDate)}
                </Text>
              </View>
            ))}
            <Button
              title="View All Harvests"
              onPress={() => router.push('/harvest')}
              variant="secondary"
              size="small"
            />
          </Card>
        )}

        <Card>
          <View style={styles.syncSection}>
            <Text style={styles.sectionTitle}>Data Sync</Text>
            <Text style={styles.syncStatus}>Last sync: {lastSync}</Text>
            <Button
              title="Sync to Drive"
              onPress={() => router.push('/settings')}
              variant="secondary"
              size="small"
            />
          </View>
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
  statsGrid: {
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    width: '100%',
  },
  harvestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  harvestInfo: {
    flex: 1,
  },
  harvestLocation: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  harvestDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  harvestDate: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
  },
  syncSection: {
    alignItems: 'center',
  },
  syncStatus: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 12,
  },
});
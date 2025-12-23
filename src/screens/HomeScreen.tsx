import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ScrollView } from 'react-native';
import { theme, commonStyles } from '../styles/theme';
import { getDBConnection } from '../services/Database';
import { getWeather, getWeatherCategory } from '../services/WeatherService';
import LinearGradient from 'react-native-linear-gradient';

const HomeScreen = ({ navigation }: any) => {
  const [stats, setStats] = useState({ totalItems: 0, wornToday: false });
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadStats();
    });
    loadWeather();
    return unsubscribe;
  }, [navigation]);

  const loadStats = async () => {
    const db = await getDBConnection();
    const result = await db.executeSql('SELECT COUNT(*) as count FROM items');
    setStats(prev => ({ ...prev, totalItems: result[0].rows.item(0).count }));
  };

  const loadWeather = async () => {
    // Mock for standard initial load, usually would use real location
    const w = await getWeather(41.0082, 28.9784);
    if (w) setWeather(w);
  };

  const getWeatherIcon = (code: number) => {
    // Simple emoji mapping
    if (code < 3) return '☀️'; // Sun
    if (code < 50) return '☁️'; // Cloud
    if (code < 80) return '🌧️'; // Rain
    return '❄️'; // Snow
  };

  return (
    <ScrollView style={commonStyles.container}>
      <Text style={[theme.typography.h1, { marginBottom: 10 }]}>Good Morning, User!</Text>

      {/* Weather Widget */}
      <LinearGradient colors={[theme.colors.secondary, theme.colors.primary]} style={styles.weatherCard}>
        <View>
          <Text style={theme.typography.h2}>{weather ? `${weather.temperature}°C` : 'Loading...'}</Text>
          <Text style={theme.typography.body}>Istanbul</Text>
        </View>
        <Text style={{ fontSize: 40 }}>{weather ? getWeatherIcon(weather.weatherCode) : '...'}</Text>
      </LinearGradient>

      {/* Wardrobe Summary */}
      <View style={[commonStyles.glassCard, { marginTop: 20 }]}>
        <Text style={theme.typography.h2}>Wardrobe Status</Text>
        <Text style={[theme.typography.body, { marginTop: 5, color: theme.colors.textSecondary }]}>
          You have {stats.totalItems} items in your closet.
        </Text>

        {stats.totalItems === 0 && (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>Your closet is empty! Start by adding your clothes.</Text>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AddItem')}>
              <Text style={theme.typography.button}>+ Add First Item</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <Text style={[theme.typography.h2, { marginTop: 30, marginBottom: 10 }]}>Quick Actions</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={styles.cardButton} onPress={() => navigation.navigate('AddItem')}>
          <Text style={styles.cardEmoji}>📸</Text>
          <Text style={styles.cardText}>Add New Item</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardButton} onPress={() => navigation.navigate('Outfits')}>
          <Text style={styles.cardEmoji}>✨</Text>
          <Text style={styles.cardText}>Get Styled</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardButton} onPress={() => navigation.navigate('Wardrobe')}>
          <Text style={styles.cardEmoji}>👔</Text>
          <Text style={styles.cardText}>My Closet</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  weatherCard: {
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyStateContainer: {
    marginTop: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 10,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  cardButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardEmoji: {
    fontSize: 30,
    marginBottom: 5,
  },
  cardText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default HomeScreen;

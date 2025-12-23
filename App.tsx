import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/Database';

function App() {
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
      } catch (e) {
        console.error('Failed to init DB', e);
      }
    };
    init();
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;

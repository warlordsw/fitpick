import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import WardrobeScreen from '../screens/WardrobeScreen';
import OutfitScreen from '../screens/OutfitScreen';
import AddItemScreen from '../screens/AddItemScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// @ts-ignore
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../styles/theme';

function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: theme.colors.secondary,
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: 0,
                    elevation: 5,
                    height: 60,
                    paddingBottom: 10,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName = 'help-circle';

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Wardrobe') {
                        iconName = focused ? 'shirt' : 'shirt-outline';
                    } else if (route.name === 'Outfits') {
                        iconName = focused ? 'color-palette' : 'color-palette-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Wardrobe" component={WardrobeScreen} />
            <Tab.Screen name="Outfits" component={OutfitScreen} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="MainTabs" component={TabNavigator} />
                <Stack.Screen name="AddItem" component={AddItemScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

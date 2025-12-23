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

function TabNavigator() {
    return (
        <Tab.Navigator screenOptions={{ headerShown: false }}>
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

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useColorScheme } from '@/shared/hooks';
import { theme } from '@/styles/theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text + '40',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: 20,
          paddingTop: 16,
          height: 90,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
        tabBarShowLabel: false,
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarBackground: () => (
          <BlurView 
            intensity={50}
            tint="light"
            style={{
              flex: 1,
              backgroundColor: theme.colors.background + 'A0',
            }}
          />
        ),
      }}
      initialRouteName="index"
    >
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 60,
              height: 40,
              borderRadius: 12,
              backgroundColor: focused ? theme.colors.primary + '20' : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons 
                name={focused ? 'book' : 'book-outline'} 
                size={24} 
                color={focused ? theme.colors.primary : color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Entry',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 60,
              height: 40,
              borderRadius: 16,
              backgroundColor: focused ? theme.colors.primary : 'transparant',
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: focused ? 0.3 : 0.15,
              shadowRadius: 8,
              elevation: focused ? 8 : 4,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons 
                name="add" 
                size={30} 
                color={focused ? "white" : color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 60,
              height: 40,
              borderRadius: 12,
              backgroundColor: focused ? theme.colors.primary + '20' : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons 
                name={focused ? 'sparkles' : 'sparkles-outline'} 
                size={24} 
                color={focused ? theme.colors.primary : color} 
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
} 
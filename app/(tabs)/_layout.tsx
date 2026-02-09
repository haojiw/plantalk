import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { theme } from '@/styles/theme';

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor={theme.colors.primary}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger
        name="journal"
        options={{
          title: 'Journal',
          icon: { sf: 'book' },
          selectedIcon: { sf: 'book.fill' },
        }}
      />
      <NativeTabs.Trigger
        name="index"
        options={{
          title: 'Home',
          icon: { sf: 'house' },
          selectedIcon: { sf: 'house.fill' },
        }}
      />
      <NativeTabs.Trigger
        name="me"
        options={{
          title: 'Me',
          icon: { sf: 'person' },
          selectedIcon: { sf: 'person.fill' },
        }}
      />
    </NativeTabs>
  );
}

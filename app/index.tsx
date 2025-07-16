import React from 'react';

import { HistoryScreenContent } from '@/components/HistoryScreenContent';
import { HomeScreenContent } from '@/components/HomeScreenContent';
import { MasterGestureContainer } from '@/components/MasterGestureContainer';
import { usePlant } from '@/context/PlantProvider';

export default function HomeScreen() {
  const { state } = usePlant();

  return (
    <MasterGestureContainer
      homeComponent={<HomeScreenContent />}
      historyComponent={<HistoryScreenContent />}
      entries={state.entries}
    />
  );
} 
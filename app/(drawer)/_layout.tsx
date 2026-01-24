import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CustomDrawerContent } from '@/features/settings';

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerType: 'front',
          drawerStyle: {
            width: '85%',
          },
          swipeEnabled: true,
          swipeEdgeWidth: 50,
        }}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerLabel: 'Home',
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: 'Profile',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="billing"
          options={{
            drawerLabel: 'Billing',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="language"
          options={{
            drawerLabel: 'Language',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="storage"
          options={{
            drawerLabel: 'Storage',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="notifications"
          options={{
            drawerLabel: 'Notifications',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="appearance"
          options={{
            drawerLabel: 'Appearance',
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

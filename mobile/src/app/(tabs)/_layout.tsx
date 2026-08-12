import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 64 },
        tabBarLabelStyle: { fontWeight: '700', paddingBottom: 7 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="sparkles" size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Thư viện',
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="albums" size={size} />,
        }}
      />
    </Tabs>
  );
}

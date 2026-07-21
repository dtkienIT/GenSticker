import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '@/components/common/AppButton';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { getMockScenario, getStickerRuntimeMode, setMockScenario } from '@/services/appServices';
import { MOCK_SCENARIOS, type MockScenario } from '@/services/generation/types';
import { useStickerStore } from '@/store/useStickerStore';
import { useAppTheme } from '@/theme';

export default function DebugScreen() {
  const enabled = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_TOOLS !== 'false';
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const [scenario, setScenarioState] = useState<MockScenario>(getMockScenario());
  const checkCapabilities = useStickerStore((state) => state.checkCapabilities);
  const capabilityStatus = useStickerStore((state) => state.capabilityStatus);

  if (!enabled) {
    return (
      <ScreenContainer>
        <Text style={[typography.body, { color: colors.textPrimary }]}>
          Developer diagnostics are disabled.
        </Text>
      </ScreenContainer>
    );
  }

  const selectScenario = async (next: MockScenario) => {
    setMockScenario(next);
    setScenarioState(next);
    await checkCapabilities();
  };

  return (
    <ScreenContainer scrollable>
      <SectionHeader
        title="Local diagnostics"
        subtitle="Inject safe, deterministic outcomes without logging prompts"
      />
      <View
        style={[
          styles.summary,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            padding: spacing.md,
          },
        ]}
      >
        <Text selectable style={[typography.body, { color: colors.textPrimary }]}>
          Runtime: {getStickerRuntimeMode()}
        </Text>
        <Text selectable style={[typography.body, { color: colors.textPrimary }]}>
          Capability: {capabilityStatus}
        </Text>
        <Text selectable style={[typography.body, { color: colors.textPrimary }]}>
          Scenario: {scenario}
        </Text>
      </View>
      <View style={styles.scenarioGrid}>
        {MOCK_SCENARIOS.map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => void selectScenario(item)}
            style={[
              styles.scenario,
              {
                backgroundColor: item === scenario ? colors.primaryLight : colors.card,
                borderColor: item === scenario ? colors.primary : colors.border,
                borderRadius: borderRadius.md,
                padding: spacing.sm,
              },
            ]}
          >
            <Text style={[typography.caption, { color: colors.textPrimary }]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <AppButton
        title="Recheck capability"
        variant="outline"
        onPress={() => void checkCapabilities()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summary: { borderWidth: 1, gap: 4, marginBottom: 16 },
  scenarioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  scenario: { borderWidth: 1 },
});

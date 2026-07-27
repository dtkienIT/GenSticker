import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '@/components/common/AppButton';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { DiagnosticsEventList } from '@/components/web/DiagnosticsEventList';
import {
  getMockScenario,
  getStickerRuntimeMode,
  setMockScenario,
  stickerServices,
} from '@/services/appServices';
import type { LocalDiagnosticEvent } from '@/services/diagnostics/types';
import { MOCK_SCENARIOS, type MockScenario } from '@/services/generation/types';
import { useStickerStore } from '@/store/useStickerStore';
import { useAppTheme } from '@/theme';

export default function DebugScreen() {
  const enabled =
    Platform.OS === 'web' || (__DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_TOOLS !== 'false');
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const [scenario, setScenarioState] = useState<MockScenario>(getMockScenario());
  const [events, setEvents] = useState<LocalDiagnosticEvent[]>([]);
  const [experimentalWasm, setExperimentalWasm] = useState(false);
  const checkCapabilities = useStickerStore((state) => state.checkCapabilities);
  const capabilityStatus = useStickerStore((state) => state.capabilityStatus);
  const modelBundleState = useStickerStore((state) => state.modelBundleState);

  const refreshEvents = async () => {
    setEvents(await stickerServices.diagnostics.list());
  };

  useEffect(() => {
    void refreshEvents();
  }, []);

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

  const exportDiagnostics = async () => {
    if (Platform.OS !== 'web') return;
    const json = await stickerServices.diagnostics.exportJson();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'gensticker-diagnostics.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clearDiagnostics = async () => {
    await stickerServices.diagnostics.clear();
    await refreshEvents();
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
        <Text selectable style={[typography.body, { color: colors.textPrimary }]}>
          Model source: {process.env.EXPO_PUBLIC_WEB_MODEL_SOURCE ?? 'local'}
        </Text>
        <Text selectable style={[typography.body, { color: colors.textPrimary }]}>
          Model status: {modelBundleState?.status ?? 'unknown'}
        </Text>
      </View>
      {getStickerRuntimeMode() === 'mock' ? (
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
      ) : null}
      <AppButton
        title="Recheck capability"
        variant="outline"
        onPress={() => void checkCapabilities()}
      />
      <View style={[styles.experimental, { borderColor: colors.border }]}>
        <View style={styles.experimentalCopy}>
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
            Experimental WASM diagnostics
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Diagnostics only. Generation remains blocked unless WebGPU with FP16 is available.
          </Text>
        </View>
        <Switch value={experimentalWasm} onValueChange={setExperimentalWasm} />
      </View>
      <View style={styles.actions}>
        <AppButton
          title="Export diagnostics JSON"
          variant="secondary"
          onPress={() => void exportDiagnostics()}
        />
        <AppButton
          title="Clear diagnostics"
          variant="outline"
          onPress={() => void clearDiagnostics()}
        />
      </View>
      <SectionHeader title="Recent events" subtitle="Stored only in this browser" />
      <DiagnosticsEventList events={events} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summary: { borderWidth: 1, gap: 4, marginBottom: 16 },
  scenarioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  scenario: { borderWidth: 1 },
  experimental: {
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    marginTop: 16,
  },
  experimentalCopy: { flex: 1, gap: 2 },
  actions: { gap: 8, marginBottom: 16 },
});

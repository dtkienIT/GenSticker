const { withAndroidManifest, withGradleProperties } = require('expo/config-plugins');

module.exports = function withStickerRuntime(config) {
  const withManifest = withAndroidManifest(config, (result) => {
    const application = result.modResults.manifest.application?.[0];
    if (!application) return result;
    application['meta-data'] = application['meta-data'] || [];
    const name = 'com.google.mlkit.vision.DEPENDENCIES';
    const value = 'subject_segment,barcode_ui';
    const existing = application['meta-data'].find((item) => item.$?.['android:name'] === name);
    if (existing) {
      existing.$['android:value'] = value;
      existing.$['tools:replace'] = 'android:value';
    } else {
      application['meta-data'].push({
        $: {
          'android:name': name,
          'android:value': value,
          'tools:replace': 'android:value',
        },
      });
    }
    return result;
  });
  return withGradleProperties(withManifest, (result) => {
    const properties = result.modResults;
    const architectures = properties.find(
      (property) => property.type === 'property' && property.key === 'reactNativeArchitectures',
    );
    if (architectures) {
      architectures.value = 'arm64-v8a';
    } else {
      properties.push({
        type: 'property',
        key: 'reactNativeArchitectures',
        value: 'arm64-v8a',
      });
    }
    return result;
  });
};

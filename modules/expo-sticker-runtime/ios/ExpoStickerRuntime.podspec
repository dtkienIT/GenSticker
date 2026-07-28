Pod::Spec.new do |s|
  s.name             = 'ExpoStickerRuntime'
  s.version          = '1.0.1'
  s.summary          = 'Offline Core ML sticker generation for GenSticker'
  s.description      = 'Expo native module providing verified model setup and iOS Core ML inference.'
  s.author           = 'VinAI'
  s.homepage         = 'https://github.com/dtkienIT/GenSticker'
  s.platform         = :ios, '17.0'
  s.source           = { :git => 'https://github.com/dtkienIT/GenSticker.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'ZIPFoundation', '0.9.20'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_VERSION' => '5.9'
  }
  s.source_files = 'ExpoStickerRuntimeModule.swift',
                   'ExpoStickerRuntimeAppDelegateSubscriber.swift',
                   'Core/**/*.swift'
  manifest = File.join(__dir__, 'Resources', 'model-distribution.manifest.json')
  s.resources = manifest if File.exist?(manifest)
end

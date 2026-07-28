// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "ExpoStickerRuntimeCore",
  platforms: [
    .iOS(.v17),
    .macOS(.v14),
  ],
  products: [
    .library(name: "ExpoStickerRuntimeCore", targets: ["ExpoStickerRuntimeCore"]),
  ],
  dependencies: [
    .package(
      url: "https://github.com/weichsel/ZIPFoundation.git",
      exact: "0.9.20"
    ),
  ],
  targets: [
    .target(
      name: "ExpoStickerRuntimeCore",
      dependencies: ["ZIPFoundation"],
      path: "Core"
    ),
    .testTarget(
      name: "ExpoStickerRuntimeCoreTests",
      dependencies: [
        "ExpoStickerRuntimeCore",
        .product(name: "ZIPFoundation", package: "ZIPFoundation"),
      ],
      path: "Tests"
    ),
  ]
)

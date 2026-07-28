import Foundation

struct RuntimeDecision: Equatable {
  let supported: Bool
  let reasonCode: String?
  let deviceKind: String
  let architecture: String
  let selectedDelegate: String
}

enum RuntimePolicy {
  static func evaluate(
    isSimulator: Bool,
    machineIdentifier: String,
    operatingSystemMajor: Int,
    physicalMemoryMb: Int
  ) -> RuntimeDecision {
    let deviceKind = isSimulator ? "simulator" : "physical"
    let supported = !isSimulator
      && operatingSystemMajor >= 17
      && physicalMemoryMb >= 4_096
      && isA14OrNewer(machineIdentifier)
    return RuntimeDecision(
      supported: supported,
      reasonCode: supported ? nil : "DEVICE_UNSUPPORTED",
      deviceKind: deviceKind,
      architecture: isSimulator ? machineIdentifier : "arm64",
      selectedDelegate: supported ? "ANE" : "NONE"
    )
  }

  private static func isA14OrNewer(_ identifier: String) -> Bool {
    guard identifier.hasPrefix("iPhone"),
      let comma = identifier.firstIndex(of: ","),
      let generation = Int(identifier[identifier.index(identifier.startIndex, offsetBy: 6)..<comma])
    else {
      return false
    }
    return generation >= 13
  }
}

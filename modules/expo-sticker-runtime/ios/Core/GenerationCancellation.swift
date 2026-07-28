import Foundation

final class GenerationCancellation {
  private let lock = NSLock()
  private var cancelled = false

  func cancel() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    guard !cancelled else { return false }
    cancelled = true
    return true
  }

  func check() throws {
    lock.lock()
    let value = cancelled
    lock.unlock()
    if value { throw GenerationCancellationError.cancelled }
  }
}

enum GenerationCancellationError: Error {
  case cancelled
}

import ExpoModulesCore
import Foundation
import UIKit

public final class ExpoStickerRuntimeAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    handleEventsForBackgroundURLSession identifier: String,
    completionHandler: @escaping () -> Void
  ) {
    guard identifier == BackgroundModelDownload.sessionIdentifier else {
      completionHandler()
      return
    }
    BackgroundModelDownload.shared.backgroundCompletionHandler = completionHandler
    BackgroundModelDownload.shared.resumeBackgroundEvents()
  }
}

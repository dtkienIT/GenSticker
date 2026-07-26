package expo.modules.stickerruntime

internal object RuntimeDiagnostics {
  fun sessionCreate(component: String, policy: SessionPolicy): String =
    "ORT_SESSION_CREATE component=$component provider=${provider(policy)}"

  fun sessionReady(component: String): String =
    "ORT_SESSION_READY component=$component"

  fun runStart(requestId: String, component: String): String =
    "ORT_RUN_START requestId=$requestId component=$component"

  fun runEnd(requestId: String, component: String): String =
    "ORT_RUN_END requestId=$requestId component=$component"

  fun cancellationAccepted(requestId: String, runActive: Boolean): String =
    "CANCEL_ACCEPTED requestId=$requestId runActive=$runActive"

  private fun provider(policy: SessionPolicy): String = when (policy) {
    SessionPolicy.PHYSICAL_NNAPI -> "NNAPI"
    SessionPolicy.EMULATOR_NNAPI -> "NNAPI_REFERENCE"
  }
}

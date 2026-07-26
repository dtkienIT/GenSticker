package expo.modules.stickerruntime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class RuntimeDiagnosticsTest {
  @Test
  fun `session and run diagnostics contain identifiers without prompt data`() {
    val session = RuntimeDiagnostics.sessionCreate(
      component = "text_encoder",
      policy = SessionPolicy.EMULATOR_NNAPI,
    )
    val run = RuntimeDiagnostics.runStart(
      requestId = "request-7",
      component = "unet_step_0",
    )

    assertEquals(
      "ORT_SESSION_CREATE component=text_encoder provider=NNAPI_REFERENCE",
      session,
    )
    assertEquals(
      "ORT_RUN_START requestId=request-7 component=unet_step_0",
      run,
    )
    assertFalse(session.contains("prompt", ignoreCase = true))
    assertFalse(run.contains("prompt", ignoreCase = true))
  }

  @Test
  fun `cancellation diagnostic records whether an active run was terminated`() {
    assertEquals(
      "CANCEL_ACCEPTED requestId=request-7 runActive=true",
      RuntimeDiagnostics.cancellationAccepted("request-7", runActive = true),
    )
  }
}

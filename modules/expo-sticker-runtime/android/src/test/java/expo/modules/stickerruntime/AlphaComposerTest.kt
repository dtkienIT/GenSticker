package expo.modules.stickerruntime

import org.junit.Assert.assertEquals
import org.junit.Test

class AlphaComposerTest {
  @Test
  fun `mask alpha is clamped and feathered`() {
    assertEquals(0, AlphaComposer.toAlpha(-1f))
    assertEquals(128, AlphaComposer.toAlpha(0.5f))
    assertEquals(255, AlphaComposer.toAlpha(2f))
  }

  @Test
  fun `transparent pixel keeps rgb and replaces alpha`() {
    assertEquals(0x00112233, AlphaComposer.withAlpha(0xff112233.toInt(), 0f))
  }
}

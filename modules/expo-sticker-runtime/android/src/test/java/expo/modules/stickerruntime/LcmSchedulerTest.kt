package expo.modules.stickerruntime

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test

class LcmSchedulerTest {
  @Test
  fun `four steps use descending LCM training timesteps`() {
    assertArrayEquals(intArrayOf(999, 759, 499, 259), LcmScheduler.timesteps(4))
  }

  @Test
  fun `seeded gaussian generation is deterministic`() {
    val first = SeededLatents.gaussian(42L, 16)
    val second = SeededLatents.gaussian(42L, 16)
    assertArrayEquals(first, second, 0f)
    assertEquals(16, first.size)
  }

  @Test
  fun `step matches pinned diffusers LCM reference vectors`() {
    assertEquals(
      3.2367105f,
      LcmScheduler.step(sample = 0.25f, modelOutput = -0.5f, noise = 0.75f, stepIndex = 0),
      0.000001f,
    )
    assertEquals(
      0.66765785f,
      LcmScheduler.step(sample = 0.25f, modelOutput = -0.5f, noise = 0.75f, stepIndex = 3),
      0.000001f,
    )
  }
}

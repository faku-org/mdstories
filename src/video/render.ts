import { renderMediaOnWeb, type RenderMediaOnWebProgress } from '@remotion/web-renderer'
import { STORY_H, STORY_W } from '../types'
import { FPS, totalFrames } from './animation'
import { StoryVideo, type StoryVideoProps } from './StoryVideo'

export type VideoQuality = 'medium' | 'high' | 'very-high'

export interface VideoRenderOptions {
  quality: VideoQuality
  /** Ask the browser for the GPU video encoder (NVENC, QuickSync, VideoToolbox…); falls back to software. */
  gpu: boolean
  signal?: AbortSignal
  onProgress?: (p: RenderMediaOnWebProgress) => void
}

/** MP4 (H.264, no audio) rendered in the browser with Remotion's web renderer; nothing leaves the machine. */
export async function renderStoryVideo(props: StoryVideoProps, opts: VideoRenderOptions): Promise<Blob> {
  const render = (hardwareAcceleration: 'prefer-hardware' | 'prefer-software') =>
    renderMediaOnWeb({
      composition: { id: 'story-video', component: StoryVideo, durationInFrames: totalFrames(props.stories), fps: FPS, width: STORY_W, height: STORY_H, defaultProps: props },
      inputProps: props,
      container: 'mp4',
      videoCodec: 'h264',
      muted: true,
      videoBitrate: opts.quality,
      hardwareAcceleration,
      signal: opts.signal ?? null,
      onProgress: opts.onProgress ?? null,
    }).then((r) => r.getBlob())

  if (!opts.gpu) return render('prefer-software')
  try {
    return await render('prefer-hardware')
  } catch (err) {
    if (opts.signal?.aborted) throw err
    // No usable hardware encoder for this size/profile: software always works.
    return render('prefer-software')
  }
}

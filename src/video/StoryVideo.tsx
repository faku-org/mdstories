import { useLayoutEffect, useRef } from 'react'
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { StoryPage } from '../components/StoryPage'
import type { StoryStyle } from '../types'
import { applyAnimation, totalFrames, type AnimationKind, type VideoStory } from './animation'

export interface StoryVideoProps extends Record<string, unknown> {
  style: StoryStyle
  stories: VideoStory[]
  total: number
  animation: AnimationKind
  progressBar: boolean
}

function ProgressBar({ style, progress }: { style: StoryStyle; progress: number }) {
  const { top, side } = style.safe
  return (
    <div style={{ position: 'absolute', left: side, right: side, top: top - 36, height: 8 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: style.colors.muted, opacity: 0.3 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${(progress * 100).toFixed(2)}%`, borderRadius: 999, background: style.colors.accent }} />
    </div>
  )
}

function AnimatedStory({ style, story, total, animation, progressBar }: { style: StoryStyle; story: VideoStory; total: number; animation: AnimationKind; progressBar: boolean }) {
  const frame = useCurrentFrame()
  const rootRef = useRef<HTMLDivElement>(null)
  // Layout effect: the style is in place before the frame is captured.
  useLayoutEffect(() => {
    if (rootRef.current) applyAnimation(rootRef.current, frame, story.frames, animation)
  })
  return (
    <AbsoluteFill>
      <StoryPage style={style} html={story.html} vars={story.vars} index={story.index} total={total} rootRef={rootRef} />
      {progressBar && <ProgressBar style={style} progress={Math.min(1, frame / Math.max(story.frames - 1, 1))} />}
    </AbsoluteFill>
  )
}

/** One composition: the given stories played back to back. */
export function StoryVideo({ style, stories, total, animation, progressBar }: StoryVideoProps) {
  return (
    <AbsoluteFill>
      {stories.map((s, i) => (
        <Sequence key={s.index} from={totalFrames(stories.slice(0, i))} durationInFrames={s.frames}>
          <AnimatedStory style={style} story={s} total={total} animation={animation} progressBar={progressBar} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}

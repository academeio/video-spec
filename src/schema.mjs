import { z } from 'zod';

const httpUrl = z.string().url().refine(
  (u) => /^https?:\/\//i.test(u),
  { message: 'must be an http(s) URL' }
);

export const NarrationWord = z.object({
  w: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
}).refine((w) => w.end > w.start, { message: 'word end must be > start' });

export const Visuals = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('title-card'),
    text: z.string(),
    codeRange: z.string().optional(),
    subtitle: z.string().optional(),
  }),
  z.object({
    kind: z.literal('image'),
    src: httpUrl,
    alt: z.string(),
    kenBurns: z.enum(['in-center', 'out-center', 'pan-left', 'pan-right', 'static']).default('static'),
  }),
  z.object({
    kind: z.literal('text-slide'),
    heading: z.string().optional(),
    bullets: z.array(z.string()).min(1).max(5),
  }),
  z.object({
    kind: z.literal('diagram-html'),
    src: httpUrl,
    height: z.number().positive().optional(),
  }),
  z.object({
    kind: z.literal('end-card'),
    takeaways: z.array(z.string()).min(1).max(5),
    nextTopic: z.string().optional(),
    competencies: z.array(z.string()).optional(),
  }),
]);

export const BloomLevel = z.enum([
  'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create',
]);

export const InteractionType = z.enum([
  'MultiChoice', 'TrueFalse', 'Blanks', 'MarkTheWords', 'Text', 'Summary',
  'DragText', 'DragQuestion', 'SingleChoiceSet', 'Image', 'IVHotspot',
  'GoToQuestion', 'FreeTextQuestion', 'Link', 'Questionnaire', 'Table',
  'MultiMediaChoice', 'Nil',
]);

export const InteractionHint = z.object({
  type: InteractionType,
  competency: z.string(),
  bloomLevel: BloomLevel,
  placement: z.enum(['button', 'poster']).default('poster'),
  pause: z.boolean().default(true),
  seekBackOnWrong: z.number().nonnegative().optional(),
});

export const Scene = z.object({
  id: z.string(),
  type: z.enum(['title', 'image', 'text', 'diagram', 'quiz-recap', 'end']),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  narration: z.string(),
  narrationWords: z.array(NarrationWord).default([]),
  visuals: Visuals,
  bloomTarget: BloomLevel.optional(),
  competencyTag: z.string().optional(),
  interactionHint: InteractionHint.optional(),
}).refine((s) => s.end > s.start, { message: 'scene end must be > start' });

export const VideoSpecSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.string(),
  topic: z.object({
    slug: z.string(),
    id: z.number().int().positive(),
    codeRange: z.string(),
    subject: z.string(),
  }),
  competencies: z.array(z.string()).min(1),
  video: z.object({
    url: httpUrl,
    duration: z.number().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    codec: z.string().default('h264'),
    audioCodec: z.string().default('aac'),
  }),
  scenes: z.array(Scene).min(1),
});

export function parseVideoSpec(input) {
  return VideoSpecSchema.parse(input);
}

export function safeParseVideoSpec(input) {
  return VideoSpecSchema.safeParse(input);
}

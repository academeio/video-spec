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

export const Panel = z.object({
  role: z.string(),
  imagePrompt: z.string(),
  caption: z.string().optional(),
});

export const TextOverlay = z.object({
  heading: z.string().optional(),
  points: z.array(z.string()).max(5).optional(),
  footnote: z.string().optional(),
});

export const ResolvedImage = z.object({
  role: z.string(),
  src: httpUrl,
});

const visualIntentBase = z.object({
  rationale: z.string(),
  textOverlay: TextOverlay.optional(),
  resolvedImages: z.array(ResolvedImage).default([]),
});

export const VisualIntent = z.discriminatedUnion('strategy', [
  visualIntentBase.extend({
    strategy: z.literal('single-image'),
    panels: z.array(Panel).length(1),
  }),
  visualIntentBase.extend({
    strategy: z.literal('compare-panels'),
    panels: z.array(Panel).length(2),
  }),
  visualIntentBase.extend({
    strategy: z.literal('whole-and-magnified'),
    panels: z.array(Panel).length(2),
  }),
  visualIntentBase.extend({
    strategy: z.literal('grid-4'),
    panels: z.array(Panel).length(4),
  }),
  visualIntentBase.extend({
    strategy: z.literal('annotated'),
    panels: z.array(Panel).length(1),
  }),
  visualIntentBase.extend({
    strategy: z.literal('timeline'),
    panels: z.array(Panel).min(3).max(7),
  }),
  visualIntentBase.extend({
    strategy: z.literal('flowchart'),
    panels: z.array(Panel).min(3).max(7),
  }),
  visualIntentBase.extend({
    strategy: z.literal('mechanism'),
    panels: z.array(Panel).min(2).max(5),
  }),
  visualIntentBase.extend({
    strategy: z.literal('imaging-study'),
    panels: z.array(Panel).min(2).max(3),
  }),
  visualIntentBase.extend({
    strategy: z.literal('text-forward'),
    panels: z.array(Panel).length(0).default([]),
  }),
]);

export const Scene = z.object({
  id: z.string(),
  type: z.enum(['title', 'image', 'text', 'diagram', 'quiz-recap', 'end']),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  narration: z.string(),
  narrationWords: z.array(NarrationWord).default([]),
  visuals: Visuals.optional(),
  visualIntent: VisualIntent.optional(),
  bloomTarget: BloomLevel.optional(),
  competencyTag: z.string().optional(),
  interactionHint: InteractionHint.optional(),
})
  .refine((s) => s.end > s.start, { message: 'scene end must be > start' })
  .refine(
    (s) => s.visuals !== undefined || s.visualIntent !== undefined,
    { message: 'scene must have either visuals or visualIntent' }
  );

export const VideoSpecSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.string(),
  theme: z.string().default('default'),
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

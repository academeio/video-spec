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

/**
 * A Panel represents one "visual beat" — a single composed image shown
 * for a slice of the scene's duration. A scene with one Panel is a
 * classic single-image scene. A scene with multiple Panels plays them
 * as a sequential slideshow (with crossfade transitions), each Panel
 * anchored to a real narration word range (startSec/endSec) decided
 * after TTS by the visual planner.
 *
 * startSec/endSec are scene-relative seconds. If either is absent the
 * renderer falls back to an equal split of the scene duration across
 * all panels.
 */
export const Panel = z.object({
  role: z.string(),
  imagePrompt: z.string(),
  caption: z.string().optional(),
  startSec: z.number().nonnegative().optional(),
  endSec: z.number().nonnegative().optional(),
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

/**
 * BoardSpec: a whiteboard-style figure drawn step by step in time with the
 * narration (the `board-reveal` strategy). Every coordinate is in data units
 * of its panel except `box` and `text.at`, which are 1920×1080 canvas pixels.
 * `claims` are numeric statements a checker verifies on the drawn curves
 * before render (see academe-video-gen src/board/check-spec.mjs).
 * Proven in the video-tools-lab Remotion board-reveal trial (11-10-2026).
 */
const BoardColor = z.enum(['ink', 'accent', 'blue', 'green', 'muted']);
const XY = z.tuple([z.number(), z.number()]);
const BoardAxis = z.object({
  min: z.number(),
  max: z.number(),
  ticks: z.array(z.number()).default([]),
  label: z.string().optional(),
}).refine((a) => a.max > a.min, { message: 'axis max must be > min' });

export const BoardPanel = z.object({
  id: z.string(),
  box: z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]),
  x: BoardAxis,
  y: BoardAxis,
  y2: BoardAxis.optional(),
  hideY: z.boolean().optional(),
});

const layerBase = { id: z.string(), step: z.number().int().positive(), color: BoardColor.default('ink') };
const onPanel = { panel: z.string(), axis: z.enum(['y', 'y2']).default('y') };

export const BoardLayer = z.discriminatedUnion('kind', [
  z.object({
    ...layerBase, ...onPanel,
    kind: z.literal('curve'),
    points: z.array(XY).min(2),
    width: z.number().positive().optional(),
  }),
  z.object({
    ...layerBase, ...onPanel,
    kind: z.literal('label'),
    at: XY,
    text: z.string(),
    anchor: z.enum(['start', 'middle', 'end']).default('start'),
    size: z.number().positive().optional(),
  }),
  z.object({ ...layerBase, ...onPanel, kind: z.literal('arrow'), from: XY, to: XY }),
  z.object({
    ...layerBase,
    kind: z.literal('bar'),
    panel: z.string(),
    x0: z.number(),
    x1: z.number(),
    row: z.number().int().positive().default(1),
    hatch: z.boolean().default(false),
    text: z.string().optional(),
  }),
  z.object({
    ...layerBase,
    kind: z.literal('text'),
    at: XY,
    text: z.string(),
    anchor: z.enum(['start', 'middle', 'end']).default('start'),
    size: z.number().positive().optional(),
  }),
  z.object({
    ...layerBase,
    kind: z.literal('vline'),
    x: z.number(),
    panels: z.array(z.string()).min(1),
    text: z.string().optional(),
  }),
]);

export const BoardStep = z.object({
  n: z.number().int().positive(),
  summary: z.string().optional(),
  narrationAnchor: z.string().min(1),
});

export const BoardClaim = z.object({
  check: z.enum(['min', 'max', 'valueAt', 'argmax', 'crossing']),
  layers: z.array(z.string()).optional(),
  a: z.array(z.string()).optional(),
  b: z.array(z.string()).optional(),
  x: z.number().optional(),
  xRange: z.tuple([z.number(), z.number()]).optional(),
  expect: z.number(),
  tol: z.number().nonnegative(),
  source: z.string().optional(),
}).refine(
  (c) => (c.check === 'crossing' ? c.a?.length && c.b?.length : c.layers?.length),
  { message: 'crossing claims need a and b; other claims need layers' },
).refine((c) => c.check !== 'valueAt' || c.x !== undefined, { message: 'valueAt claims need x' });

export const BoardSpec = z.object({
  title: z.string().optional(),
  panels: z.array(BoardPanel).min(1),
  layers: z.array(BoardLayer).min(1),
  steps: z.array(BoardStep).min(1),
  claims: z.array(BoardClaim).default([]),
}).superRefine((b, ctx) => {
  const panels = new Set(b.panels.map((p) => p.id));
  const steps = new Set(b.steps.map((s) => s.n));
  const ids = new Set();
  for (const l of b.layers) {
    if (ids.has(l.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate layer id ${l.id}` });
    ids.add(l.id);
    if (l.kind === 'curve' && !l.points.every((p, i) => i === 0 || p[0] > l.points[i - 1][0])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `curve ${l.id}: points must have strictly increasing x` });
    }
    if (!steps.has(l.step)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `layer ${l.id}: step ${l.step} is not in steps` });
    for (const p of l.kind === 'vline' ? l.panels : l.panel ? [l.panel] : []) {
      if (!panels.has(p)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `layer ${l.id}: unknown panel ${p}` });
    }
  }
  for (const c of b.claims) {
    for (const id of [...(c.layers ?? []), ...(c.a ?? []), ...(c.b ?? [])]) {
      if (!ids.has(id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `claim refers to unknown layer ${id}` });
    }
  }
});

const visualIntentBase = z.object({
  rationale: z.string(),
  textOverlay: TextOverlay.optional(),
  resolvedImages: z.array(ResolvedImage).default([]),
});

export const VisualIntent = z.discriminatedUnion('strategy', [
  visualIntentBase.extend({
    strategy: z.literal('single-image'),
    // 1 = classic single-image scene. 2–5 = sequential beats (slideshow
    // with crossfade transitions). The planner decides based on how
    // many distinct concepts the narration covers.
    panels: z.array(Panel).min(1).max(5),
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
    // Same beat semantics as single-image (1–5 sequential beats), plus
    // a required textOverlay.points label list displayed alongside.
    panels: z.array(Panel).min(1).max(5),
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
  visualIntentBase.extend({
    // A figure drawn from data, step by step, as the narration reaches each
    // step's anchor phrase. No images: panels stay empty.
    strategy: z.literal('board-reveal'),
    panels: z.array(Panel).length(0).default([]),
    board: BoardSpec,
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

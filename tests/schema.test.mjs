import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  VideoSpecSchema,
  parseVideoSpec,
  safeParseVideoSpec,
} from '../src/index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) =>
  JSON.parse(readFileSync(resolve(here, '..', 'fixtures', name), 'utf-8'));

describe('VideoSpecSchema', () => {
  it('parses minimal fixture', () => {
    const spec = parseVideoSpec(fixture('minimal.json'));
    expect(spec.schemaVersion).toBe(1);
    expect(spec.scenes).toHaveLength(1);
  });

  it('parses full fixture with every scene type', () => {
    const spec = parseVideoSpec(fixture('full.json'));
    expect(spec.scenes).toHaveLength(6);
    const types = spec.scenes.map((s) => s.type);
    expect(types).toEqual(['title', 'image', 'text', 'diagram', 'quiz-recap', 'end']);
  });

  it('round-trips: parse -> serialize -> parse equals original', () => {
    const original = fixture('full.json');
    const parsed = parseVideoSpec(original);
    const reSerialised = JSON.parse(JSON.stringify(parsed));
    const reParsed = parseVideoSpec(reSerialised);
    expect(reParsed).toEqual(parsed);
  });

  it('rejects scene with end <= start', () => {
    const bad = fixture('minimal.json');
    bad.scenes[0].end = 0.0;
    const result = safeParseVideoSpec(bad);
    expect(result.success).toBe(false);
  });

  it('rejects unknown scene visual kind', () => {
    const bad = fixture('minimal.json');
    bad.scenes[0].visuals = { kind: 'martian', payload: 'oops' };
    const result = safeParseVideoSpec(bad);
    expect(result.success).toBe(false);
  });

  it('rejects empty competencies array', () => {
    const bad = fixture('minimal.json');
    bad.competencies = [];
    const result = safeParseVideoSpec(bad);
    expect(result.success).toBe(false);
  });

  it('preserves narrationWords order', () => {
    const spec = parseVideoSpec(fixture('full.json'));
    const words = spec.scenes[0].narrationWords;
    expect(words[0].w).toBe('The');
    expect(words[1].w).toBe('axilla.');
  });

  it('applies kenBurns default of "static" when omitted', () => {
    const minimal = fixture('minimal.json');
    minimal.scenes.push({
      id: 'scene-1',
      type: 'image',
      start: 5.0,
      end: 10.0,
      narration: '...',
      narrationWords: [],
      visuals: { kind: 'image', src: 'https://example.com/x.png', alt: 'x' },
    });
    const spec = parseVideoSpec(minimal);
    expect(spec.scenes[1].visuals.kenBurns).toBe('static');
  });

  it('parses a scene with visualIntent (whole-and-magnified)', () => {
    const spec = parseVideoSpec(fixture('full.json'));
    const scene1 = spec.scenes.find((s) => s.id === 'scene-1');
    expect(scene1.visualIntent).toBeDefined();
    expect(scene1.visualIntent.strategy).toBe('whole-and-magnified');
    expect(scene1.visualIntent.panels).toHaveLength(2);
    expect(scene1.visualIntent.panels[0].role).toBe('whole');
  });

  it('rejects a grid-4 visualIntent with wrong panel count', () => {
    const bad = fixture('minimal.json');
    bad.scenes[0] = {
      id: 'scene-x',
      type: 'image',
      start: 0,
      end: 5,
      narration: 'x',
      narrationWords: [],
      visualIntent: {
        strategy: 'grid-4',
        rationale: 'r',
        panels: [
          { role: 'a', imagePrompt: 'a' },
          { role: 'b', imagePrompt: 'b' },
        ],
        resolvedImages: [],
      },
    };
    const result = safeParseVideoSpec(bad);
    expect(result.success).toBe(false);
  });

  it('rejects a scene with neither visuals nor visualIntent', () => {
    const bad = fixture('minimal.json');
    delete bad.scenes[0].visuals;
    const result = safeParseVideoSpec(bad);
    expect(result.success).toBe(false);
  });

  it('applies theme default of "default" when omitted', () => {
    const spec = parseVideoSpec(fixture('minimal.json'));
    expect(spec.theme).toBe('default');
  });

  it('parses an explicit theme value', () => {
    const withTheme = fixture('minimal.json');
    withTheme.theme = 'medical-cool';
    const spec = parseVideoSpec(withTheme);
    expect(spec.theme).toBe('medical-cool');
  });
});

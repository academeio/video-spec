import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { BoardSpec, safeParseVideoSpec } from '../src/index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) =>
  JSON.parse(readFileSync(resolve(here, '..', 'fixtures', name), 'utf-8'));

// board-slide4.json: the cardiac vs skeletal action-potential board from the
// video-tools-lab trial (30/30 claims passed the checker there).
const board = () => fixture('board-slide4.json');

describe('BoardSpec', () => {
  it('parses the lab board fixture', () => {
    const b = BoardSpec.parse(board());
    expect(b.panels.map((p) => p.id)).toEqual(['cardiac', 'skeletal']);
    expect(b.claims.length).toBeGreaterThan(0);
  });

  it('rejects a curve whose x does not strictly increase', () => {
    const b = board();
    const curve = b.layers.find((l) => l.kind === 'curve');
    curve.points = [[0, 0], [0, 1]];
    const r = BoardSpec.safeParse(b);
    expect(r.success).toBe(false);
    expect(r.error.issues[0].message).toMatch(/strictly increasing x/);
  });

  it('rejects a claim that names an unknown layer', () => {
    const b = board();
    b.claims[0].layers = ['no-such-layer'];
    const r = BoardSpec.safeParse(b);
    expect(r.success).toBe(false);
    expect(r.error.issues[0].message).toMatch(/unknown layer no-such-layer/);
  });

  it('rejects a layer on a step that does not exist', () => {
    const b = board();
    b.layers[0].step = 99;
    expect(BoardSpec.safeParse(b).success).toBe(false);
  });

  it('rejects a crossing claim without a and b', () => {
    const b = board();
    b.claims.push({ check: 'crossing', layers: [b.layers[0].id], expect: 1, tol: 1 });
    expect(BoardSpec.safeParse(b).success).toBe(false);
  });
});

describe('board-reveal strategy', () => {
  const withBoardScene = (visualIntent) => {
    const spec = fixture('minimal.json');
    spec.scenes[0].visualIntent = visualIntent;
    return spec;
  };

  it('accepts a scene whose visualIntent carries a board', () => {
    const r = safeParseVideoSpec(
      withBoardScene({ strategy: 'board-reveal', rationale: 'phases drawn live', board: board() }),
    );
    expect(r.success).toBe(true);
    expect(r.data.scenes[0].visualIntent.panels).toEqual([]);
  });

  it('rejects board-reveal without a board', () => {
    const r = safeParseVideoSpec(withBoardScene({ strategy: 'board-reveal', rationale: 'x' }));
    expect(r.success).toBe(false);
  });
});

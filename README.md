# @academeio/video-spec

Zod schema for the `video-spec.json` contract used by `academe-video-gen` and `academe-h5p-iv`.

## Install

```bash
pnpm add @academeio/video-spec
```

Requires a `.npmrc` with `@academeio:registry=https://npm.pkg.github.com` and a GitHub PAT with `read:packages` scope.

## Usage

```js
import { VideoSpecSchema, parseVideoSpec } from '@academeio/video-spec';

const spec = parseVideoSpec(jsonFromBunny);  // throws on invalid
```

## Versioning

Major version bumps signal breaking schema changes. Both consumer repos pin to a compatible major.

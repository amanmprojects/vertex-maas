# @ai-sdk/vertex-maas

Vertex MaaS provider for the Vercel AI SDK.

This provider targets **Vertex AI models exposed via OpenAI-compatible endpoints** and authenticates using **Google Application Default Credentials (ADC)** (service account JSON via `GOOGLE_APPLICATION_CREDENTIALS`, workload identity, etc.).

## Usage

```ts
import { generateText } from 'ai';
import { createVertexMaaS } from '@amanm/vertex-maas';

const vertex = createVertexMaaS({
  project: process.env.GOOGLE_VERTEX_PROJECT!,
  location: process.env.GOOGLE_VERTEX_LOCATION!, // e.g. "global" or "us-central1"
});

const result = await generateText({
  model: vertex('glm-4.7'),
  prompt: 'Explain Amdahl\\'s Law in simple terms.',
});
```

## Settings

- `baseURL`: Optional. If set, used directly.
- `project` / `location`: Used to compute the Vertex OpenAI-compatible base URL if `baseURL` is not provided.
- `apiKey`: Optional. If set, uses a static `Authorization: Bearer <apiKey>` header (no ADC).
- `googleAuthOptions`: Optional. Passed to `google-auth-library` `GoogleAuth`.

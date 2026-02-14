import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageModelV3Prompt } from '@ai-sdk/provider';
import { createVertexMaaS } from './vertex-maas-provider';
import { generateAuthToken } from './vertex-maas-auth-google-auth-library';

vi.mock('./vertex-maas-auth-google-auth-library', () => ({
  generateAuthToken: vi.fn(),
}));

const TEST_PROMPT: LanguageModelV3Prompt = [
  { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
];

function normalizeHeaders(headers: HeadersInit | undefined) {
  const h = new Headers(headers);
  return Object.fromEntries(
    Array.from(h.entries()).map(([k, v]) => [k.toLowerCase(), v]),
  ) as Record<string, string>;
}

describe('createVertexMaaS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_VERTEX_PROJECT;
    delete process.env.GOOGLE_VERTEX_LOCATION;
  });

  it('computes baseURL from env and injects ADC token via Authorization header', async () => {
    process.env.GOOGLE_VERTEX_PROJECT = 'test-project';
    process.env.GOOGLE_VERTEX_LOCATION = 'global';

    vi.mocked(generateAuthToken).mockResolvedValue('adc-token');

    const expectedUrl =
      'https://aiplatform.googleapis.com/v1beta1/projects/test-project/locations/global/endpoints/openapi/chat/completions';

    const fetch = vi.fn(async (url: any, init?: RequestInit) => {
      expect(String(url)).toBe(expectedUrl);
      expect(normalizeHeaders(init?.headers).authorization).toBe(
        'Bearer adc-token',
      );

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: { role: 'assistant', content: 'hi' },
              finish_reason: 'stop',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const vertex = createVertexMaaS({ fetch });
    const result = await vertex('glm-4.7').doGenerate({ prompt: TEST_PROMPT });
    expect(result.content[0]).toEqual({ type: 'text', text: 'hi' });
  });

  it('uses static apiKey and does not call ADC', async () => {
    vi.mocked(generateAuthToken).mockResolvedValue('adc-token');

    const fetch = vi.fn(async (_url: any, init?: RequestInit) => {
      expect(normalizeHeaders(init?.headers).authorization).toBe(
        'Bearer static-token',
      );

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: { role: 'assistant', content: 'ok' },
              finish_reason: 'stop',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const vertex = createVertexMaaS({
      baseURL: 'https://my.vertex/v1',
      apiKey: 'static-token',
      fetch,
    });

    await vertex('glm-4.7').doGenerate({ prompt: TEST_PROMPT });
    expect(generateAuthToken).not.toHaveBeenCalled();
  });

  it('throws when baseURL is missing and env vars are not set', async () => {
    vi.mocked(generateAuthToken).mockResolvedValue('adc-token');

    const vertex = createVertexMaaS({
      fetch: vi.fn(async () => new Response(null)),
    });

    await expect(
      vertex('glm-4.7').doGenerate({ prompt: TEST_PROMPT }),
    ).rejects.toBeDefined();
  });

  it('includes query params when configured', async () => {
    process.env.GOOGLE_VERTEX_PROJECT = 'test-project';
    process.env.GOOGLE_VERTEX_LOCATION = 'global';
    vi.mocked(generateAuthToken).mockResolvedValue('adc-token');

    const fetch = vi.fn(async (url: any) => {
      const parsed = new URL(String(url));
      expect(parsed.searchParams.get('foo')).toBe('bar');

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: { role: 'assistant', content: 'ok' },
              finish_reason: 'stop',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const vertex = createVertexMaaS({ fetch, queryParams: { foo: 'bar' } });
    await vertex('glm-4.7').doGenerate({ prompt: TEST_PROMPT });
  });

  it('does not override caller-provided Authorization header', async () => {
    process.env.GOOGLE_VERTEX_PROJECT = 'test-project';
    process.env.GOOGLE_VERTEX_LOCATION = 'global';

    vi.mocked(generateAuthToken).mockResolvedValue('adc-token');

    const fetch = vi.fn(async (_url: any, init?: RequestInit) => {
      expect(normalizeHeaders(init?.headers).authorization).toBe(
        'Bearer preset',
      );

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: { role: 'assistant', content: 'ok' },
              finish_reason: 'stop',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const vertex = createVertexMaaS({
      fetch,
      headers: { Authorization: 'Bearer preset' },
    });

    await vertex('glm-4.7').doGenerate({ prompt: TEST_PROMPT });
    expect(generateAuthToken).not.toHaveBeenCalled();
  });
});

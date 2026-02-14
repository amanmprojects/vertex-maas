import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVertexMaaSAuthFetch } from './vertex-maas-auth-fetch';
import { generateAuthToken } from './vertex-maas-auth-google-auth-library';

vi.mock('./vertex-maas-auth-google-auth-library', () => ({
  generateAuthToken: vi.fn(),
}));

describe('createVertexMaaSAuthFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should inject Authorization header when missing', async () => {
    vi.mocked(generateAuthToken).mockResolvedValue('token123');

    const customFetch = vi.fn().mockResolvedValue(new Response(null));
    const wrappedFetch = createVertexMaaSAuthFetch({ customFetch });

    await wrappedFetch('https://example.com', {
      method: 'POST',
      headers: { 'x-test': '1' },
    });

    expect(customFetch).toHaveBeenCalledTimes(1);
    const init = customFetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as any).authorization).toBe('Bearer token123');
    expect((init.headers as any)['x-test']).toBe('1');
  });

  it('should not override existing Authorization header', async () => {
    vi.mocked(generateAuthToken).mockResolvedValue('token123');

    const customFetch = vi.fn().mockResolvedValue(new Response(null));
    const wrappedFetch = createVertexMaaSAuthFetch({ customFetch });

    await wrappedFetch('https://example.com', {
      method: 'POST',
      headers: { Authorization: 'Bearer preset' },
    });

    expect(generateAuthToken).not.toHaveBeenCalled();
    expect(customFetch).toHaveBeenCalledTimes(1);
    const init = customFetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as any).Authorization).toBe('Bearer preset');
  });
});

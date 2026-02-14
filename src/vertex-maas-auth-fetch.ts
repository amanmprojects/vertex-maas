import { FetchFunction, normalizeHeaders } from '@ai-sdk/provider-utils';
import type { GoogleAuthOptions } from 'google-auth-library';
import { generateAuthToken } from './vertex-maas-auth-google-auth-library';

export function createVertexMaaSAuthFetch({
  customFetch,
  googleAuthOptions,
}: {
  customFetch?: FetchFunction;
  googleAuthOptions?: GoogleAuthOptions;
}): FetchFunction {
  return async (url, init) => {
    const existingHeaders = normalizeHeaders(init?.headers as any);

    // Respect caller-provided auth (including static api keys).
    if (existingHeaders.authorization != null) {
      return (customFetch ?? fetch)(url as any, init);
    }

    const token = await generateAuthToken(googleAuthOptions);
    if (!token) {
      throw new Error('Failed to get access token from ADC');
    }

    const modifiedInit: RequestInit = {
      ...init,
      headers: {
        ...existingHeaders,
        authorization: `Bearer ${token}`,
      },
    };

    return (customFetch ?? fetch)(url as any, modifiedInit);
  };
}

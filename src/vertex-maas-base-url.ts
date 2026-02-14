import { withoutTrailingSlash } from '@ai-sdk/provider-utils';

function getDefaultVertexApiBase(location: string): string {
  return location === 'global'
    ? 'https://aiplatform.googleapis.com'
    : `https://${location}-aiplatform.googleapis.com`;
}

export function getVertexOpenAICompatibleBaseURL({
  project,
  location,
  apiVersion,
  apiBase,
}: {
  project: string;
  location: string;
  apiVersion: 'v1' | 'v1beta1';
  apiBase?: string;
}): string {
  const resolvedApiBase = withoutTrailingSlash(
    apiBase ?? getDefaultVertexApiBase(location),
  );

  return `${resolvedApiBase}/${apiVersion}/projects/${project}/locations/${location}/endpoints/openapi`;
}

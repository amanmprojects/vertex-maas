import {
  MetadataExtractor,
  OpenAICompatibleProvider,
  OpenAICompatibleChatLanguageModel,
  OpenAICompatibleCompletionLanguageModel,
  OpenAICompatibleEmbeddingModel,
  OpenAICompatibleImageModel,
} from '@ai-sdk/openai-compatible';
import {
  FetchFunction,
  loadSetting,
  withoutTrailingSlash,
  withUserAgentSuffix,
} from '@ai-sdk/provider-utils';
import type { GoogleAuthOptions } from 'google-auth-library';
import { VERSION } from './version';
import { createVertexMaaSAuthFetch } from './vertex-maas-auth-fetch';
import { getVertexOpenAICompatibleBaseURL } from './vertex-maas-base-url';
import type {
  EmbeddingModelV3,
  ImageModelV3,
  LanguageModelV3,
} from '@ai-sdk/provider';

type OpenAICompatibleChatConfig = ConstructorParameters<
  typeof OpenAICompatibleChatLanguageModel
>[1];

export interface VertexMaaSProviderSettings {
  /**
   * Base URL for the API calls. If not set, it is derived from `project` and
   * `location`.
   */
  baseURL?: string;

  /**
   * Vertex project id. Defaults to `GOOGLE_VERTEX_PROJECT` if `baseURL` is not
   * provided.
   */
  project?: string;

  /**
   * Vertex location. Defaults to `GOOGLE_VERTEX_LOCATION` if `baseURL` is not
   * provided.
   */
  location?: string;

  /**
   * API version used when computing baseURL. Defaults to `v1beta1`.
   */
  apiVersion?: 'v1' | 'v1beta1';

  /**
   * Override the base host for Vertex API calls (e.g. "https://aiplatform.googleapis.com").
   * If not set, it is computed from location.
   */
  apiBase?: string;

  /**
   * Optional. Use a static bearer token instead of ADC.
   */
  apiKey?: string;

  /**
   * Optional. Passed to google-auth-library for ADC token generation.
   */
  googleAuthOptions?: GoogleAuthOptions;

  /**
   * Optional custom headers.
   */
  headers?: Record<string, string>;

  /**
   * Optional custom url query parameters to include in request urls.
   */
  queryParams?: Record<string, string>;

  /**
   * Custom fetch implementation.
   */
  fetch?: FetchFunction;

  includeUsage?: boolean;
  supportsStructuredOutputs?: boolean;
  transformRequestBody?: (args: Record<string, any>) => Record<string, any>;
  metadataExtractor?: MetadataExtractor;
}

export type VertexMaaSProvider = OpenAICompatibleProvider;

export function createVertexMaaS(
  options: VertexMaaSProviderSettings = {},
): VertexMaaSProvider {
  const providerName = 'vertexMaas';

  let baseURLCache: string | null = null;
  const getBaseURL = () => {
    if (baseURLCache != null) {
      return baseURLCache;
    }

    baseURLCache =
      withoutTrailingSlash(options.baseURL) ??
      getVertexOpenAICompatibleBaseURL({
        project: loadSetting({
          settingValue: options.project,
          settingName: 'project',
          environmentVariableName: 'GOOGLE_VERTEX_PROJECT',
          description: 'Google Vertex project',
        }),
        location: loadSetting({
          settingValue: options.location,
          settingName: 'location',
          environmentVariableName: 'GOOGLE_VERTEX_LOCATION',
          description: 'Google Vertex location',
        }),
        apiVersion: options.apiVersion ?? 'v1beta1',
        apiBase: options.apiBase,
      });

    return baseURLCache;
  };

  interface CommonModelConfig {
    provider: string;
    url: ({ path }: { path: string }) => string;
    headers: () => Record<string, string>;
    fetch?: FetchFunction;
  }

  const staticHeaders = {
    ...(options.apiKey && { Authorization: `Bearer ${options.apiKey}` }),
    ...options.headers,
  };

  const getHeaders = () =>
    withUserAgentSuffix(staticHeaders, `ai-sdk/vertex-maas/${VERSION}`);

  const fetch =
    options.apiKey != null
      ? options.fetch
      : createVertexMaaSAuthFetch({
          customFetch: options.fetch,
          googleAuthOptions: options.googleAuthOptions,
        });

  const getCommonModelConfig = (modelType: string): CommonModelConfig => ({
    provider: `${providerName}.${modelType}`,
    url: ({ path }) => {
      const url = new URL(`${getBaseURL()}${path}`);
      if (options.queryParams) {
        url.search = new URLSearchParams(options.queryParams).toString();
      }
      return url.toString();
    },
    headers: getHeaders,
    fetch,
  });

  const createLanguageModel = (modelId: string) => createChatModel(modelId);

  const createChatModel = (modelId: string) =>
    new OpenAICompatibleChatLanguageModel(modelId, {
      ...getCommonModelConfig('chat'),
      includeUsage: options.includeUsage,
      supportsStructuredOutputs: options.supportsStructuredOutputs,
      transformRequestBody: options.transformRequestBody,
      metadataExtractor: options.metadataExtractor,
    });

  const createCompletionModel = (modelId: string) =>
    new OpenAICompatibleCompletionLanguageModel(modelId, {
      ...getCommonModelConfig('completion'),
      includeUsage: options.includeUsage,
    });

  const createEmbeddingModel = (modelId: string) =>
    new OpenAICompatibleEmbeddingModel(modelId, {
      ...getCommonModelConfig('embedding'),
    });

  const createImageModel = (modelId: string) =>
    new OpenAICompatibleImageModel(modelId, getCommonModelConfig('image'));

  const provider = (modelId: string) => createLanguageModel(modelId);

  provider.specificationVersion = 'v3' as const;
  provider.languageModel = (
    modelId: string,
    config?: Partial<OpenAICompatibleChatConfig>,
  ): LanguageModelV3 =>
    new OpenAICompatibleChatLanguageModel(modelId, {
      ...getCommonModelConfig('chat'),
      includeUsage: options.includeUsage,
      supportsStructuredOutputs: options.supportsStructuredOutputs,
      transformRequestBody: options.transformRequestBody,
      metadataExtractor: options.metadataExtractor,
      ...config,
    });
  provider.chatModel = createChatModel;
  provider.completionModel = createCompletionModel;
  provider.embeddingModel = createEmbeddingModel as (
    modelId: string,
  ) => EmbeddingModelV3;
  provider.textEmbeddingModel = createEmbeddingModel as (
    modelId: string,
  ) => EmbeddingModelV3;
  provider.imageModel = createImageModel as (modelId: string) => ImageModelV3;

  return provider as unknown as OpenAICompatibleProvider;
}

/**
 * Default Vertex MaaS provider instance.
 */
export const vertexMaaS = createVertexMaaS();

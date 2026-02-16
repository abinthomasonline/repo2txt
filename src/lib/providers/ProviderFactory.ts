/**
 * Factory for creating provider instances
 */

import type { ProviderType } from '@/types';
import type { IProvider } from './types';
import { ProviderError, ErrorCode } from './types';

/**
 * Provider registry
 */
const providers = new Map<ProviderType, new () => IProvider>();

/**
 * Register a provider class
 */
export function registerProvider(type: ProviderType, providerClass: new () => IProvider): void {
  providers.set(type, providerClass);
}

/**
 * Create a provider instance by type
 */
export function createProvider(type: ProviderType): IProvider {
  const ProviderClass = providers.get(type);

  if (!ProviderClass) {
    throw new ProviderError(
      `Provider type "${type}" not found`,
      ErrorCode.UNKNOWN,
      `The provider type "${type}" is not supported. Please check your selection.`
    );
  }

  return new ProviderClass();
}

/**
 * Check if a provider type is registered
 */
export function isProviderRegistered(type: ProviderType): boolean {
  return providers.has(type);
}

/**
 * Get all registered provider types
 */
export function getRegisteredProviders(): ProviderType[] {
  return Array.from(providers.keys());
}

/**
 * Get provider instance for a URL
 * Attempts to detect the provider type from the URL
 */
export function getProviderForUrl(url: string): IProvider | null {
  // Try to detect provider from URL
  if (url.includes('github.com')) {
    if (isProviderRegistered('github')) {
      return createProvider('github');
    }
  } else if (url.includes('gitlab.com') || url.includes('gitlab')) {
    if (isProviderRegistered('gitlab')) {
      return createProvider('gitlab');
    }
  } else if (url.includes('dev.azure.com') || url.includes('visualstudio.com')) {
    if (isProviderRegistered('azure')) {
      return createProvider('azure');
    }
  }

  return null;
}

/**
 * Provider factory class (alternative to functional API)
 */
export class ProviderFactory {
  private static instance: ProviderFactory;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory();
    }
    return ProviderFactory.instance;
  }

  /**
   * Create a provider instance
   */
  create(type: ProviderType): IProvider {
    return createProvider(type);
  }

  /**
   * Register a provider
   */
  register(type: ProviderType, providerClass: new () => IProvider): void {
    registerProvider(type, providerClass);
  }

  /**
   * Get provider for URL
   */
  getForUrl(url: string): IProvider | null {
    return getProviderForUrl(url);
  }

  /**
   * Check if registered
   */
  isRegistered(type: ProviderType): boolean {
    return isProviderRegistered(type);
  }

  /**
   * Get all registered types
   */
  getRegistered(): ProviderType[] {
    return getRegisteredProviders();
  }
}

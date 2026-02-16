import { StateCreator } from 'zustand';
import { ProviderType, ProviderCredentials, RepoMetadata } from '@/types';

export interface ProviderSlice {
  providerType: ProviderType | null;
  credentials: ProviderCredentials | null;
  repoMetadata: RepoMetadata | null;
  isLoading: boolean;
  error: string | null;

  setProviderType: (type: ProviderType) => void;
  setCredentials: (credentials: ProviderCredentials) => void;
  setRepoMetadata: (metadata: RepoMetadata) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  providerType: null,
  credentials: null,
  repoMetadata: null,
  isLoading: false,
  error: null,
};

export const createProviderSlice: StateCreator<ProviderSlice> = (set) => ({
  ...initialState,

  setProviderType: (type: ProviderType) => set({ providerType: type }),

  setCredentials: (credentials: ProviderCredentials) => {
    set({ credentials });
    // Store token securely (sessionStorage for now, can add encryption later)
    if (credentials.token) {
      sessionStorage.setItem('provider_token', credentials.token);
    }
  },

  setRepoMetadata: (metadata: RepoMetadata) => set({ repoMetadata: metadata }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error }),

  reset: () => {
    sessionStorage.removeItem('provider_token');
    set(initialState);
  },
});

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createThemeSlice } from './slices/themeSlice';
import { createProviderSlice } from './slices/providerSlice';
import { createFileTreeSlice } from './slices/fileTreeSlice';
import { createUISlice } from './slices/uiSlice';
import type { ThemeSlice } from './slices/themeSlice';
import type { ProviderSlice } from './slices/providerSlice';
import type { FileTreeSlice } from './slices/fileTreeSlice';
import type { UISlice } from './slices/uiSlice';

export type AppStore = ThemeSlice & ProviderSlice & FileTreeSlice & UISlice;

export const useStore = create<AppStore>()(
  devtools(
    (...a) => ({
      ...createThemeSlice(...a),
      ...createProviderSlice(...a),
      ...createFileTreeSlice(...a),
      ...createUISlice(...a),
    }),
    {
      name: 'repo2txt-store',
    }
  )
);

// Export individual slices for convenience
export { type ThemeSlice } from './slices/themeSlice';
export { type ProviderSlice } from './slices/providerSlice';
export { type FileTreeSlice } from './slices/fileTreeSlice';
export { type UISlice } from './slices/uiSlice';

import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Le logo est déjà plein cadre (fond violet) : pas de marge ajoutée, le système arrondit les coins.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0 },
    apple: { ...minimal2023Preset.apple, padding: 0 },
  },
  images: ['public/logo.svg'],
});

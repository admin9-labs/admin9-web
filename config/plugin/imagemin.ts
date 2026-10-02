/**
 * Image resource files used to compress the output of the production environment
 * 图片压缩
 * https://github.com/FatehAK/vite-plugin-image-optimizer
 */
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default function configImageminPlugin() {
  const imageminPlugin = ViteImageOptimizer({
    gif: {
      interlaced: false,
    },
    png: {
      quality: 90,
      compressionLevel: 9,
    },
    jpeg: {
      quality: 20,
    },
    jpg: {
      quality: 20,
    },
    svg: {
      plugins: [
        {
          name: 'preset-default',
          params: { overrides: { removeEmptyAttrs: false } },
        },
      ],
    },
  });
  return imageminPlugin;
}

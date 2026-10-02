import { mergeConfig } from 'vite';
import baseConfig from './vite.config.base';
import configCompressPlugin from './plugin/compress';
import configVisualizerPlugin from './plugin/visualizer';
import configArcoResolverPlugin from './plugin/arcoResolver';
import configImageminPlugin from './plugin/imagemin';

export default mergeConfig(
  {
    mode: 'staging',
    plugins: [configCompressPlugin('gzip'), configVisualizerPlugin(), configArcoResolverPlugin(), configImageminPlugin()],
    build: {
      chunkSizeWarningLimit: 2000,
    },
  },
  baseConfig
);

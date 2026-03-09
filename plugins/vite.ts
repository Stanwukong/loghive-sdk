import * as path from 'path';
import { uploadSourceMaps } from '../cli/upload-sourcemaps';

export interface ApperioVitePluginOptions {
  release: string;
  projectId: string;
  apiKey: string;
  endpoint?: string;
  outDir?: string;
}

/**
 * Vite plugin that automatically uploads source maps to Apperio
 * after each production build.
 *
 * Usage:
 * ```ts
 * import { apperioVitePlugin } from 'apperio/plugins/vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     apperioVitePlugin({
 *       release: '1.0.0',
 *       projectId: 'your-project-id',
 *       apiKey: 'your-api-key',
 *     }),
 *   ],
 * });
 * ```
 *
 * Vite types are intentionally avoided so that vite is not required
 * as a dependency. The function returns a plain plugin-shaped object.
 */
export function apperioVitePlugin(options: ApperioVitePluginOptions) {
  const { release, projectId, apiKey, endpoint, outDir = 'dist' } = options;

  if (!release) {
    throw new Error('[apperioVitePlugin] "release" is required');
  }
  if (!projectId) {
    throw new Error('[apperioVitePlugin] "projectId" is required');
  }
  if (!apiKey) {
    throw new Error('[apperioVitePlugin] "apiKey" is required');
  }

  return {
    name: 'apperio-sourcemap-upload',
    apply: 'build' as const,

    async closeBundle() {
      const resolvedOutDir = path.resolve(process.cwd(), outDir);

      console.log(`[apperio-vite] Uploading source maps from ${resolvedOutDir}...`);

      try {
        const result = await uploadSourceMaps({
          release,
          projectId,
          apiKey,
          endpoint,
          sourceMapDir: resolvedOutDir,
        });

        if (result.failed.length > 0) {
          console.warn(
            `[apperio-vite] ${result.failed.length} source map(s) failed to upload.`
          );
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[apperio-vite] Source map upload error: ${message}`);
      }
    },
  };
}

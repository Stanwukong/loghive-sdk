import { uploadSourceMaps } from '../cli/upload-sourcemaps';

export interface MonitaWebpackPluginOptions {
  release: string;
  projectId: string;
  apiKey: string;
  endpoint?: string;
}

/**
 * Webpack plugin that automatically uploads source maps to Monita
 * after each successful build.
 *
 * Usage:
 * ```js
 * const { MonitaWebpackPlugin } = require('monita/plugins/webpack');
 *
 * module.exports = {
 *   plugins: [
 *     new MonitaWebpackPlugin({
 *       release: '1.0.0',
 *       projectId: 'your-project-id',
 *       apiKey: 'your-api-key',
 *     }),
 *   ],
 * };
 * ```
 *
 * Webpack types are intentionally avoided (`any` is used for Compiler
 * and Compilation) so that webpack is not required as a dependency.
 */
export class MonitaWebpackPlugin {
  private options: MonitaWebpackPluginOptions;

  constructor(options: MonitaWebpackPluginOptions) {
    if (!options.release) {
      throw new Error('[MonitaWebpackPlugin] "release" is required');
    }
    if (!options.projectId) {
      throw new Error('[MonitaWebpackPlugin] "projectId" is required');
    }
    if (!options.apiKey) {
      throw new Error('[MonitaWebpackPlugin] "apiKey" is required');
    }
    this.options = options;
  }

  /**
   * Called by webpack to install the plugin.
   * Hooks into `afterEmit` so source maps are uploaded once assets
   * have been written to disk.
   */
  apply(compiler: any): void {
    compiler.hooks.afterEmit.tapAsync(
      'MonitaWebpackPlugin',
      async (compilation: any, callback: (err?: Error) => void) => {
        const outputPath: string | undefined = compilation.outputOptions?.path ?? compiler.options?.output?.path;

        if (!outputPath) {
          console.error('[MonitaWebpackPlugin] Could not determine output path. Skipping source map upload.');
          callback();
          return;
        }

        console.log(`[MonitaWebpackPlugin] Uploading source maps from ${outputPath}...`);

        try {
          const result = await uploadSourceMaps({
            release: this.options.release,
            projectId: this.options.projectId,
            apiKey: this.options.apiKey,
            endpoint: this.options.endpoint,
            sourceMapDir: outputPath,
          });

          if (result.failed.length > 0) {
            console.warn(
              `[MonitaWebpackPlugin] ${result.failed.length} source map(s) failed to upload.`
            );
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[MonitaWebpackPlugin] Source map upload error: ${message}`);
        }

        callback();
      }
    );
  }
}

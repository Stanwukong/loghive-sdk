import { uploadSourceMaps } from '../cli/upload-sourcemaps';

export interface ApperioWebpackPluginOptions {
  release: string;
  projectId: string;
  apiKey: string;
  endpoint?: string;
}

/**
 * Webpack plugin that automatically uploads source maps to Apperio
 * after each successful build.
 *
 * Usage:
 * ```js
 * const { ApperioWebpackPlugin } = require('apperio/plugins/webpack');
 *
 * module.exports = {
 *   plugins: [
 *     new ApperioWebpackPlugin({
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
export class ApperioWebpackPlugin {
  private options: ApperioWebpackPluginOptions;

  constructor(options: ApperioWebpackPluginOptions) {
    if (!options.release) {
      throw new Error('[ApperioWebpackPlugin] "release" is required');
    }
    if (!options.projectId) {
      throw new Error('[ApperioWebpackPlugin] "projectId" is required');
    }
    if (!options.apiKey) {
      throw new Error('[ApperioWebpackPlugin] "apiKey" is required');
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
      'ApperioWebpackPlugin',
      async (compilation: any, callback: (err?: Error) => void) => {
        const outputPath: string | undefined = compilation.outputOptions?.path ?? compiler.options?.output?.path;

        if (!outputPath) {
          console.error('[ApperioWebpackPlugin] Could not determine output path. Skipping source map upload.');
          callback();
          return;
        }

        console.log(`[ApperioWebpackPlugin] Uploading source maps from ${outputPath}...`);

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
              `[ApperioWebpackPlugin] ${result.failed.length} source map(s) failed to upload.`
            );
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[ApperioWebpackPlugin] Source map upload error: ${message}`);
        }

        callback();
      }
    );
  }
}

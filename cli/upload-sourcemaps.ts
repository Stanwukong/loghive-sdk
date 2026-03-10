import * as fs from 'fs';
import * as path from 'path';

export interface UploadOptions {
  release: string;
  projectId: string;
  apiKey: string;
  endpoint?: string;
  sourceMapDir: string;
}

export interface UploadResult {
  uploaded: string[];
  failed: string[];
  totalSize: number;
}

const DEFAULT_ENDPOINT = 'https://apperioserver.onrender.com/api/v1';

/**
 * Recursively find all `.map` files within a directory.
 */
export function findMapFiles(dir: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findMapFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.map')) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Upload source map files to the Apperio server for a given release.
 *
 * Discovers all `.map` files under `sourceMapDir`, reads their content,
 * and POSTs each one to the sourcemaps ingestion endpoint. Progress is
 * logged to the console and the function returns a summary of results.
 */
export async function uploadSourceMaps(options: UploadOptions): Promise<UploadResult> {
  const {
    release,
    projectId,
    apiKey,
    endpoint = DEFAULT_ENDPOINT,
    sourceMapDir,
  } = options;

  const result: UploadResult = {
    uploaded: [],
    failed: [],
    totalSize: 0,
  };

  // Resolve directory to an absolute path
  const resolvedDir = path.resolve(sourceMapDir);

  if (!fs.existsSync(resolvedDir)) {
    console.error(`[apperio] Source map directory not found: ${resolvedDir}`);
    return result;
  }

  const mapFiles = findMapFiles(resolvedDir);

  if (mapFiles.length === 0) {
    console.warn(`[apperio] No .map files found in: ${resolvedDir}`);
    return result;
  }

  console.log(`[apperio] Found ${mapFiles.length} source map file(s) in ${resolvedDir}`);
  console.log(`[apperio] Uploading for release "${release}" to project "${projectId}"`);

  const uploadUrl = `${endpoint.replace(/\/+$/, '')}/${projectId}/sourcemaps`;

  for (const filePath of mapFiles) {
    const relativePath = path.relative(resolvedDir, filePath);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileSize = Buffer.byteLength(content, 'utf-8');

      const body = JSON.stringify({
        release,
        file: relativePath,
        sourceMap: content,
      });

      console.log(`[apperio]   Uploading ${relativePath} (${formatBytes(fileSize)})...`);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      result.uploaded.push(relativePath);
      result.totalSize += fileSize;
      console.log(`[apperio]   Uploaded ${relativePath}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[apperio]   Failed to upload ${relativePath}: ${message}`);
      result.failed.push(relativePath);
    }
  }

  console.log(
    `[apperio] Upload complete: ${result.uploaded.length} succeeded, ` +
    `${result.failed.length} failed, ${formatBytes(result.totalSize)} total`
  );

  return result;
}

/**
 * Format a byte count into a human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

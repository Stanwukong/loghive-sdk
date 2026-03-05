// src/compression.ts

/**
 * Log Compression Utilities
 *
 * Compresses log payloads using gzip/deflate to reduce bandwidth and API costs.
 * Falls back to uncompressed if compression is not available or payload is small.
 */

import { isInBrowser } from "./utils";

export interface CompressionResult {
  data: string | Uint8Array;
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
  encoding?: "gzip" | "deflate";
}

/**
 * Minimum payload size to trigger compression (1KB)
 */
const MIN_COMPRESSION_SIZE = 1024;

/**
 * Compress a JSON payload if it exceeds the minimum size threshold
 */
export async function compressPayload(
  payload: any,
  minSize: number = MIN_COMPRESSION_SIZE
): Promise<CompressionResult> {
  const jsonString = JSON.stringify(payload);
  const originalSize = jsonString.length;

  // Don't compress small payloads
  if (originalSize < minSize) {
    return {
      data: jsonString,
      compressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }

  // Try browser CompressionStream API (modern browsers)
  if (isInBrowser() && "CompressionStream" in window) {
    try {
      const compressedData = await compressWithCompressionStream(jsonString);
      return {
        data: compressedData,
        compressed: true,
        originalSize,
        compressedSize: compressedData.byteLength,
        encoding: "gzip",
      };
    } catch (error) {
      console.warn("CompressionStream failed, falling back to uncompressed:", error);
      return {
        data: jsonString,
        compressed: false,
        originalSize,
        compressedSize: originalSize,
      };
    }
  }

  // Node.js environment (using zlib)
  if (!isInBrowser() && typeof require !== "undefined") {
    try {
      const compressedData = await compressWithZlib(jsonString);
      return {
        data: compressedData,
        compressed: true,
        originalSize,
        compressedSize: compressedData.byteLength,
        encoding: "gzip",
      };
    } catch (error) {
      console.warn("zlib compression failed, falling back to uncompressed:", error);
      return {
        data: jsonString,
        compressed: false,
        originalSize,
        compressedSize: originalSize,
      };
    }
  }

  // Fallback: no compression available
  return {
    data: jsonString,
    compressed: false,
    originalSize,
    compressedSize: originalSize,
  };
}

/**
 * Compress using browser CompressionStream API
 */
async function compressWithCompressionStream(text: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(text);

  // @ts-ignore - CompressionStream may not be in TS types yet
  const compressionStream = new CompressionStream("gzip");
  const writer = compressionStream.writable.getWriter();
  writer.write(uint8Array);
  writer.close();

  const chunks: Uint8Array[] = [];
  const reader = compressionStream.readable.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Combine chunks into single Uint8Array
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Compress using Node.js zlib
 */
async function compressWithZlib(text: string): Promise<Uint8Array> {
  const zlib = require("zlib");
  const util = require("util");
  const gzipAsync = util.promisify(zlib.gzip);

  const buffer = Buffer.from(text, "utf8");
  const compressed = await gzipAsync(buffer);

  return new Uint8Array(compressed);
}

/**
 * Convert Uint8Array to base64 string for transmission
 */
export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  if (isInBrowser()) {
    // Browser environment
    const binaryString = String.fromCharCode(...uint8Array);
    return btoa(binaryString);
  } else {
    // Node.js environment
    return Buffer.from(uint8Array).toString("base64");
  }
}

/**
 * Prepare payload for transmission
 * Returns JSON string or base64-encoded compressed data
 */
export async function preparePayloadForTransmission(
  payload: any,
  compressionEnabled: boolean = true
): Promise<{
  data: string;
  headers: Record<string, string>;
  metadata: {
    compressed: boolean;
    originalSize: number;
    compressedSize: number;
    compressionRatio?: number;
  };
}> {
  if (!compressionEnabled) {
    const jsonString = JSON.stringify(payload);
    return {
      data: jsonString,
      headers: {
        "Content-Type": "application/json",
      },
      metadata: {
        compressed: false,
        originalSize: jsonString.length,
        compressedSize: jsonString.length,
      },
    };
  }

  const result = await compressPayload(payload);

  if (result.compressed && result.data instanceof Uint8Array) {
    const base64Data = uint8ArrayToBase64(result.data);

    return {
      data: base64Data,
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": result.encoding || "gzip",
        "X-Original-Size": result.originalSize.toString(),
        "X-Compressed-Size": result.compressedSize.toString(),
      },
      metadata: {
        compressed: true,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.originalSize / result.compressedSize,
      },
    };
  }

  // Not compressed (small payload or compression failed)
  return {
    data: result.data as string,
    headers: {
      "Content-Type": "application/json",
    },
    metadata: {
      compressed: false,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
    },
  };
}

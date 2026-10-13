/**
 * Cloudflare R2 Storage Archiver for Official Lottery Result PDFs & Images.
 * Provides free-tier object storage archiving with public CDN access.
 */

export async function archiveDrawArtifact(
  bucket: R2Bucket,
  drawId: string,
  fileName: string,
  content: ArrayBuffer,
  contentType: string
): Promise<string> {
  const objectKey = `results/${drawId}/${fileName}`;

  await bucket.put(objectKey, content, {
    httpMetadata: {
      contentType: contentType,
      cacheControl: 'public, max-age=31536000, immutable'
    },
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      drawId: drawId
    }
  });

  return `/api/archive/${objectKey}`;
}

export async function fetchDrawArtifact(
  bucket: R2Bucket,
  objectKey: string
): Promise<R2ObjectBody | null> {
  return await bucket.get(objectKey);
}

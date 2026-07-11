/**
 * Generates short human-friendly public-facing IDs (e.g. PAT-482913) that are
 * separate from MongoDB's internal ObjectId. Kept as string fields so they can
 * be safely shown in UI, printed on receipts, or looked up without exposing
 * ObjectId internals.
 */
export function generatePublicId(prefix: string): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${random}`;
}

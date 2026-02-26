/** Generate N variation slot definitions. Prompts are built dynamically by prompt-builder.ts. */
export function makeVariations(count: number): { label: string }[] {
  return Array.from({ length: count }, (_, i) => ({ label: `Variation ${i + 1}` }));
}

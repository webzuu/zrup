/**
 * Creates a column-first table with right-aligned labels and word-wrapped values
 * @param data - Record of labels to values
 * @param options - Formatting options
 * @returns Formatted string ready to be printed to console
 */
export declare function formatKeyValueTable(data: Record<string, string | number | boolean>, options?: {
    totalWidth?: number;
    spacing?: number;
    labelSuffix?: string;
}): string;
//# sourceMappingURL=format-key-value-table.d.ts.map
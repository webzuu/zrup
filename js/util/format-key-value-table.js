/**
 * Creates a column-first table with right-aligned labels and word-wrapped values
 * @param data - Record of labels to values
 * @param options - Formatting options
 * @returns Formatted string ready to be printed to console
 */
export function formatKeyValueTable(data, options = {}) {
    // Default options
    const totalWidth = options.totalWidth || process.stdout.columns || 80;
    const spacing = options.spacing || 2;
    const suffix = options.labelSuffix || '';
    // Find the longest label length to determine column width
    const labelWidth = Math.max(...Object.keys(data).map(key => key.length)) + suffix.length;
    const valueWidth = totalWidth - labelWidth - spacing;
    // Format each row
    const rows = Object.entries(data).map(([label, value]) => {
        // Right-align and bold the label
        const formattedLabel = `\x1b[1m${label.padStart(labelWidth)}${suffix}\x1b[0m`;
        // Convert value to string and word-wrap it
        const valueStr = String(value);
        const wrappedValue = wordWrap(valueStr, valueWidth);
        // Format first line with label
        const lines = wrappedValue.split('\n');
        const firstLine = `${formattedLabel}${' '.repeat(spacing)}${lines[0]}`;
        // Format continuation lines (if any)
        const continuationLines = lines.slice(1).map(line => `${' '.repeat(labelWidth + spacing)}${line}`);
        return [firstLine, ...continuationLines].join('\n');
    });
    return rows.join('\n');
}
/**
 * Word wraps text to a specific width
 * @param text - Text to wrap
 * @param width - Maximum width per line
 * @returns Text with newlines inserted for wrapping
 */
function wordWrap(text, width) {
    if (text.length <= width) {
        return text;
    }
    const lines = [];
    let line = '';
    const words = text.split(' ');
    for (const word of words) {
        if (line.length + word.length + (line.length > 0 ? 1 : 0) <= width) {
            line += (line.length > 0 ? ' ' : '') + word;
        }
        else {
            if (line.length > 0) {
                lines.push(line);
            }
            // Handle words longer than the width
            if (word.length > width) {
                let remainingWord = word;
                while (remainingWord.length > 0) {
                    lines.push(remainingWord.slice(0, width));
                    remainingWord = remainingWord.slice(width);
                }
                line = '';
            }
            else {
                line = word;
            }
        }
    }
    if (line.length > 0) {
        lines.push(line);
    }
    return lines.join('\n');
}
// Example usage:
// import { formatKeyValueTable } from './formatKeyValueTable.js';
//
// const data = {
//   'First Name': 'John',
//   'Last Name': 'Smith',
//   'Email Address': 'john.smith@example.com',
//   'Account ID': '12345678',
//   'Subscription': 'A very long subscription description that will automatically wrap to fit the width constraint and display properly in the console output'
// };
//
// console.log(formatKeyValueTable(data, { totalWidth: 80, spacing: 2 }));
//# sourceMappingURL=format-key-value-table.js.map
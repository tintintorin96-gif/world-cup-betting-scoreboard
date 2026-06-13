export interface TableRow {
  cells: string[];
}

export function normalizeTableHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function parseMarkdownTable(content: string): TableRow[] {
  const lines = content.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2) return [];

  const rows: TableRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^\|[\s\-:|]+\|$/)) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length) rows.push({ cells });
  }
  return rows;
}

export function getTableColumnIndex(headers: string[], ...names: string[]): number {
  const normalized = headers.map(normalizeTableHeader);
  for (const name of names) {
    const idx = normalized.indexOf(normalizeTableHeader(name));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseOrderedList(content: string): string[] {
  return content
    .split('\n')
    .map((l) => l.match(/^\d+\.\s+(.+)$/)?.[1]?.trim())
    .filter((v): v is string => Boolean(v));
}

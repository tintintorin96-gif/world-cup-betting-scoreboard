export interface TableRow {
  cells: string[];
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

export function parseOrderedList(content: string): string[] {
  return content
    .split('\n')
    .map((l) => l.match(/^\d+\.\s+(.+)$/)?.[1]?.trim())
    .filter((v): v is string => Boolean(v));
}

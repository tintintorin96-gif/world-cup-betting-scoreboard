import { ParseError } from './errors';

export const REQUIRED_HEADINGS = [
  'Group Stage Predictions',
  'Predicted Group Standings',
  'Predicted Group Winners',
  'Knockout Predictions',
] as const;

export const OPTIONAL_HEADINGS = ['Score Summary'] as const;

export type SectionKey = (typeof REQUIRED_HEADINGS)[number] | (typeof OPTIONAL_HEADINGS)[number];

export function splitByH2(markdown: string): Map<string, { content: string; line: number }> {
  const sections = new Map<string, { content: string; line: number }>();
  const lines = markdown.split('\n');
  let currentHeading: string | null = null;
  let currentContent: string[] = [];
  let currentLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2Match = line.match(/^##\s+(.+?)\s*$/);
    if (h2Match) {
      if (currentHeading) {
        sections.set(currentHeading, { content: currentContent.join('\n').trim(), line: currentLine });
      }
      currentHeading = h2Match[1].trim();
      currentContent = [];
      currentLine = i + 2;
    } else if (currentHeading) {
      currentContent.push(line);
    }
  }

  if (currentHeading) {
    sections.set(currentHeading, { content: currentContent.join('\n').trim(), line: currentLine });
  }

  return sections;
}

export function assertRequiredHeadings(
  sections: Map<string, { content: string; line: number }>,
  filePath: string,
): void {
  for (const heading of REQUIRED_HEADINGS) {
    if (!sections.has(heading)) {
      throw new ParseError(`Missing required heading: ## ${heading}`, filePath);
    }
  }
}

const EMOJI_PATTERN =
  /[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[\u{E0020}-\u{E007E}]+\u{E007F}|[\u{1F3FB}-\u{1F3FF}]|[\u{200D}\u{FE0F}]|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{E0020}-\u{E007F}]/gu;

export function stripEmoji(input: string): string {
  return input.replace(EMOJI_PATTERN, '').trim();
}

export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

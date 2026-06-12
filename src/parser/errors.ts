export class ParseError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly line?: number,
  ) {
    super(line ? `${message} (${filePath}:${line})` : `${message} (${filePath})`);
    this.name = 'ParseError';
  }
}

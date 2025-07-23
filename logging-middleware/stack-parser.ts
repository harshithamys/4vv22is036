import { StackInfo } from './types';

export class StackTraceParser {
  static parseStack(skipFrames: number = 2): StackInfo[] {
    const error = new Error();
    const stack = error.stack;
    
    if (!stack) {
      return [];
    }

    const lines = stack.split('\n').slice(skipFrames);
    const stackInfo: StackInfo[] = [];

    for (const line of lines) {
      const parsed = this.parseStackLine(line);
      if (parsed) {
        stackInfo.push(parsed);
      }
    }

    return stackInfo;
  }

  private static parseStackLine(line: string): StackInfo | null {
    const cleanLine = line.replace(/^\s*at\s*/, '');
    
    const patterns = [
      /^(.+?)\s+\((.+?):(\d+):(\d+)\)$/,
      /^\((.+?):(\d+):(\d+)\)$/,
      /^(.+?):(\d+):(\d+)$/
    ];

    for (const pattern of patterns) {
      const match = cleanLine.match(pattern);
      if (match) {
        if (match.length === 5) {
          // Function name pattern
          return {
            function: match[1] || '<anonymous>',
            file: this.cleanFilePath(match[2]),
            line: parseInt(match[3]),
            column: parseInt(match[4])
          };
        } else if (match.length === 4) {
          // File-only pattern
          return {
            function: '<anonymous>',
            file: this.cleanFilePath(match[1]),
            line: parseInt(match[2]),
            column: parseInt(match[3])
          };
        }
      }
    }

    return null;
  }

  /**
   * Clean and normalize file paths
   * @param filePath Raw file path from stack trace
   * @returns Cleaned file path
   */
  private static cleanFilePath(filePath: string): string {
    // Remove file:// protocol and decode URI components
    const cleaned = filePath.replace(/^file:\/\//, '').replace(/%20/g, ' ');
    
    // Get relative path from project root if possible
    const projectRoot = process.cwd();
    if (cleaned.startsWith(projectRoot)) {
      return cleaned.substring(projectRoot.length + 1);
    }
    
    return cleaned;
  }

  /**
   * Format stack trace for display
   * @param stack Array of stack information
   * @param maxFrames Maximum number of frames to display
   * @returns Formatted stack trace string
   */
  static formatStack(stack: StackInfo[], maxFrames: number = 10): string {
    const frames = stack.slice(0, maxFrames);
    return frames.map((frame, index) => {
      const padding = '  '.repeat(index + 1);
      return `${padding}at ${frame.function} (${frame.file}:${frame.line}:${frame.column})`;
    }).join('\n');
  }
}

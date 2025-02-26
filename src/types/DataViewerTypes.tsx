
export interface ProcessedLine {
  number: number;
  content: string;
  isHighlighted?: boolean;
}

export interface TokenStyle {
  className: string;
  test?: RegExp;
}
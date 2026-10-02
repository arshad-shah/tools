const JAVA_EXCEPTION =
  /^(?:[a-z_$][\w$]*\.)+[A-Z][\w$]*(?:Exception|Error|Throwable)\b/;
const PYTHON_EXCEPTION =
  /^[A-Za-z_][\w.]*(?:Error|Exception|Exit|Interrupt|Warning|Iteration)\b(?::|$)/;

/**
 * Whether `line` continues the previous entry (spec §8.1): indented lines,
 * stack frames (`at `, `File "`), `Caused by:`, `... n more`, `Traceback`,
 * a caret marker, and the exception line that heads or ends a trace.
 */
export function isContinuation(
  line: string,
  prev: string | undefined,
): boolean {
  if (prev === undefined || line.trim() === '') return false;
  if (/^\s+\S/.test(line)) return true;
  if (/^(?:at |Caused by:|Suppressed:|Traceback \(|File ")/.test(line))
    return true;
  if (/^\s*\.\.\. \d+ more/.test(line)) return true;
  if (JAVA_EXCEPTION.test(line)) return true;
  // The last line of a Python traceback follows an indented frame.
  if (/^\s+\S/.test(prev) && PYTHON_EXCEPTION.test(line)) return true;
  return false;
}

import { describe as group, expect, it } from 'vitest';
import { toSnippet, type SnippetLanguage } from './code';

// A pattern with /, ", \\, a raw newline and a named group and backreference.
const PATTERN = '(?<id>\\d+)/"x"\\\\\n\\k<id>';
const TEXT = 'a "b"\n$c\\';

const EXPECTED: Record<SnippetLanguage, { code: string; warnings: string[] }> =
  {
    js: {
      code: 'const regex = /(?<id>\\d+)\\/"x"\\\\\\n\\k<id>/gimy;\nconst text = "a \\"b\\"\\n$c\\\\";\nconst matches = [...text.matchAll(regex)];',
      warnings: [],
    },
    python: {
      code: 'import re\n\npattern = re.compile("(?P<id>\\\\d+)/\\"x\\"\\\\\\\\\\\\n(?P=id)", re.IGNORECASE | re.MULTILINE)\ntext = "a \\"b\\"\\n$c\\\\"\nmatches = [m.group(0) for m in pattern.finditer(text)]',
      warnings: ['Python has no equivalent of the y flag; it was left out'],
    },
    go: {
      code: 'package main\n\nimport (\n\t"fmt"\n\t"regexp"\n)\n\nfunc main() {\n\tre := regexp.MustCompile(`(?im)(?P<id>\\d+)/"x"\\\\\\n\\k<id>`)\n\ttext := "a \\"b\\"\\n$c\\\\"\n\tfmt.Println(re.FindAllString(text, -1))\n}',
      warnings: [
        'RE2 does not support lookarounds or backreferences',
        'Go has no equivalent of the y flag; it was left out',
      ],
    },
    php: {
      code: '<?php\n$text = "a \\"b\\"\\n\\$c\\\\";\npreg_match_all(\'/(?<id>\\\\d+)\\\\/"x"\\\\\\\\\\\\n\\\\k<id>/im\', $text, $matches);\nprint_r($matches);',
      warnings: ['PHP has no equivalent of the y flag; it was left out'],
    },
    java: {
      code: 'import java.util.regex.Matcher;\nimport java.util.regex.Pattern;\n\nPattern pattern = Pattern.compile("(?<id>\\\\d+)/\\"x\\"\\\\\\\\\\\\n\\\\k<id>", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);\nMatcher matcher = pattern.matcher("a \\"b\\"\\n$c\\\\");\nwhile (matcher.find()) {\n    System.out.println(matcher.group());\n}',
      warnings: ['Java has no equivalent of the y flag; it was left out'],
    },
    csharp: {
      code: 'using System;\nusing System.Text.RegularExpressions;\n\nvar regex = new Regex(@"(?<id>\\d+)/""x""\\\\\\n\\k<id>", RegexOptions.IgnoreCase | RegexOptions.Multiline);\nvar text = "a \\"b\\"\\n$c\\\\";\nforeach (Match m in regex.Matches(text))\n    Console.WriteLine(m.Value);',
      warnings: ['C# has no equivalent of the y flag; it was left out'],
    },
  };

group('toSnippet', () => {
  it.each(Object.keys(EXPECTED) as SnippetLanguage[])(
    'escapes %s correctly',
    (lang) => {
      expect(toSnippet(lang, PATTERN, 'gimy', TEXT)).toEqual(EXPECTED[lang]);
    },
  );

  it('runs the JavaScript snippet', () => {
    const { code } = toSnippet('js', PATTERN, 'g', 'x 12/"x"\\\n12');
    const matches = new Function(`${code}\nreturn matches;`)() as string[][];
    expect(matches.map((m) => m[0])).toEqual(['12/"x"\\\n12']);
  });

  it('uses a Python raw string when it can', () => {
    expect(toSnippet('python', '\\d+\\.', 'i', 'x').code).toContain(
      "re.compile(r'\\d+\\.', re.IGNORECASE)",
    );
    // A trailing backslash cannot end a raw string.
    expect(toSnippet('python', 'a\\\\', '', 'x').code).toContain(
      're.compile("a\\\\\\\\")',
    );
  });

  it('warns about a Go lookbehind and the Python y flag', () => {
    expect(toSnippet('go', '(?<=\\$)\\d+', 'g', '').warnings).toEqual([
      'RE2 does not support lookarounds or backreferences',
    ]);
    expect(toSnippet('go', '\\d+', 'g', '').warnings).toEqual([]);
    expect(toSnippet('python', 'a', 'y', '').warnings).toEqual([
      'Python has no equivalent of the y flag; it was left out',
    ]);
  });

  it('uses a Go quoted string when the pattern has a backtick', () => {
    expect(toSnippet('go', 'a`b', '', '').code).toContain(
      'regexp.MustCompile("a`b")',
    );
  });
});

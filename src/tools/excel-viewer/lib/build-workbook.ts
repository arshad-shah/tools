import { strToU8, zipSync } from 'fflate';

/**
 * Builds XLSX workbooks from raw parts, for the sample and the tests,
 * covering what the reader handles (shared and rich strings, inline strings,
 * formulas, dates, errors, merges, sparse cells, hidden and chart sheets).
 */

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

export interface FixtureSheet {
  name: string;
  state?: 'hidden' | 'veryHidden';
  /** `<sheetData>` inner XML and anything after it; omit for a chart sheet. */
  xml?: string;
}

export function buildWorkbook({
  sheets,
  sharedStrings = [],
  styles,
  date1904 = false,
  prefix = '',
}: {
  sheets: FixtureSheet[];
  /** Raw `<si>` inner XML per string. */
  sharedStrings?: string[];
  /** Raw styles.xml body (inside `<styleSheet>`). */
  styles?: string;
  date1904?: boolean;
  /** Element prefix for the workbook and sheets (`x:`), to test namespaces. */
  prefix?: string;
}): Uint8Array {
  const p = prefix;
  const xmlns = p ? `xmlns:${p.slice(0, -1)}="${NS}"` : `xmlns="${NS}"`;
  const rels = sheets.map(
    (s, i) =>
      `<Relationship Id="rId${i + 1}" Type="${REL}/${s.xml === undefined ? 'chartsheet' : 'worksheet'}" Target="${s.xml === undefined ? 'chartsheets' : 'worksheets'}/sheet${i + 1}.xml"/>`,
  );
  const n = sheets.length;
  rels.push(
    `<Relationship Id="rId${n + 1}" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/>`,
    `<Relationship Id="rId${n + 2}" Type="${REL}/styles" Target="/xl/styles.xml"/>`,
  );
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`,
    ),
    '_rels/.rels': strToU8(
      `${XML}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    'xl/workbook.xml': strToU8(
      `${XML}<${p}workbook ${xmlns} xmlns:r="${REL}"><${p}workbookPr${date1904 ? ' date1904="1"' : ''}/><${p}sheets>${sheets
        .map(
          (s, i) =>
            `<${p}sheet name="${s.name}" sheetId="${i + 1}"${s.state ? ` state="${s.state}"` : ''} r:id="rId${i + 1}"/>`,
        )
        .join('')}</${p}sheets></${p}workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `${XML}<Relationships xmlns="${PKG}">${rels.join('')}</Relationships>`,
    ),
    'xl/sharedStrings.xml': strToU8(
      `${XML}<sst xmlns="${NS}" count="${sharedStrings.length}">${sharedStrings.map((s) => `<si>${s}</si>`).join('')}</sst>`,
    ),
    'xl/styles.xml': strToU8(
      `${XML}<styleSheet xmlns="${NS}">${styles ?? '<cellXfs count="1"><xf numFmtId="0"/></cellXfs>'}</styleSheet>`,
    ),
  };
  sheets.forEach((s, i) => {
    if (s.xml === undefined)
      files[`xl/chartsheets/sheet${i + 1}.xml`] = strToU8(
        `${XML}<chartsheet xmlns="${NS}"/>`,
      );
    else
      files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(
        `${XML}<${p}worksheet ${xmlns}>${s.xml}</${p}worksheet>`,
      );
  });
  return zipSync(files, { level: 6 });
}

/** Styles: 0 General, 1 built-in date (14), 2 custom date-time, 3 percent, 4 duration, 5 time. */
export const RICH_STYLES =
  '<numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd hh:mm"/><numFmt numFmtId="165" formatCode="[h]:mm:ss"/></numFmts>' +
  '<cellXfs count="6"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="10"/><xf numFmtId="165"/><xf numFmtId="21"/></cellXfs>';

/** A workbook with one of everything the reader handles. */
export function richWorkbook(date1904 = false): Uint8Array {
  return buildWorkbook({
    date1904,
    styles: RICH_STYLES,
    sharedStrings: [
      '<t>Name</t>',
      '<t>Joined</t>',
      '<r><rPr><b/></rPr><t>Bold</t></r><r><t xml:space="preserve"> and plain</t></r><rPh><t>ignored</t></rPh>',
      '<t>Ada</t>',
      '<t>Line_x000D__x000A_break</t>',
    ],
    sheets: [
      {
        name: 'Data',
        xml:
          '<dimension ref="A1:F5"/><sheetData>' +
          '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="inlineStr"><is><t>Score</t></is></c><c r="D1" t="inlineStr"><is><r><t>Ri</t></r><r><t>ch</t></r></is></c></row>' +
          '<row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2" s="1"><v>45000</v></c><c r="C2"><v>0.1</v></c><c r="D2" t="b"><v>1</v></c><c r="E2" s="2"><v>45000.5</v></c><c r="F2" t="e"><v>#DIV/0!</v></c></row>' +
          '<row r="3"><c r="A3" t="s"><v>2</v></c><c r="C3"><f>C2*2</f><v>0.2</v></c><c r="D3" t="str"><f>A2&amp;"!"</f><v>Ada!</v></c><c r="E3" s="4"><v>1.5</v></c><c r="F3" s="5"><v>0.75</v></c></row>' +
          // Shared formula: master in C4, used by C5 (no text).
          '<row r="4"><c r="C4"><f t="shared" ref="C4:C5" si="0">C3+$C$2</f><v>0.3</v></c><c r="D4" s="3"><v>0.25</v></c></row>' +
          '<row r="5"><c r="C5"><f t="shared" si="0"/><v>0.4</v></c><c r="E5" t="s"><v>4</v></c></row>' +
          // Sparse: a far cell and cells without r attributes.
          '<row r="9"><c t="inlineStr"><is><t>no ref 1</t></is></c><c t="inlineStr"><is><t>no ref 2</t></is></c><c r="AB9"><v>7</v></c></row>' +
          '</sheetData><mergeCells count="1"><mergeCell ref="A6:C7"/></mergeCells>',
      },
      {
        name: 'Secret',
        state: 'hidden',
        xml: '<sheetData><row r="1"><c r="A1"><v>42</v></c></row></sheetData>',
      },
      { name: 'Chart' },
    ],
  });
}

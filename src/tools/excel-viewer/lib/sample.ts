import { buildWorkbook, RICH_STYLES } from './build-workbook';

const inline = (ref: string, text: string, style = '') =>
  `<c r="${ref}" t="inlineStr"${style}><is><t>${text}</t></is></c>`;

/**
 * A small demo workbook: an orders sheet with a merged title, dates, a
 * shared formula and a total, plus a hidden lookup sheet.
 */
export function sampleWorkbook(): Uint8Array {
  const orders = [
    ['Notebook', 45292, 3, 4.5],
    ['Pen', 45299, 10, 1.2],
    ['Lamp', 45310, 1, 24.99],
    ['Chair', 45333, 1, 89],
    ['Notebook', 45351, 2, 4.5],
  ] as const;
  const rows = orders
    .map(([item, date, qty, price], i) => {
      const r = i + 3;
      const total =
        i === 0
          ? `<c r="E${r}"><f t="shared" ref="E3:E7" si="0">C${r}*D${r}</f><v>${qty * price}</v></c>`
          : `<c r="E${r}"><f t="shared" si="0"/><v>${qty * price}</v></c>`;
      return `<row r="${r}">${inline(`A${r}`, item)}<c r="B${r}" s="1"><v>${date}</v></c><c r="C${r}"><v>${qty}</v></c><c r="D${r}"><v>${price}</v></c>${total}</row>`;
    })
    .join('');
  const sum = orders.reduce((s, [, , q, p]) => s + q * p, 0);
  return buildWorkbook({
    styles: RICH_STYLES,
    sharedStrings: [
      '<t>Item</t>',
      '<t>Ordered</t>',
      '<t>Quantity</t>',
      '<t>Price</t>',
      '<t>Total</t>',
    ],
    sheets: [
      {
        name: 'Orders',
        xml:
          `<sheetData><row r="1">${inline('A1', 'Orders, first quarter')}</row>` +
          `<row r="2">${[0, 1, 2, 3, 4].map((i) => `<c r="${'ABCDE'[i]}2" t="s"><v>${i}</v></c>`).join('')}</row>` +
          rows +
          `<row r="8">${inline('A8', 'Total')}<c r="E8"><f>SUM(E3:E7)</f><v>${Number(sum.toFixed(2))}</v></c></row>` +
          '</sheetData><mergeCells count="1"><mergeCell ref="A1:E1"/></mergeCells>',
      },
      {
        name: 'Lookup',
        state: 'hidden',
        xml: `<sheetData><row r="1">${inline('A1', 'Rate')}<c r="B1"><v>0.2</v></c></row></sheetData>`,
      },
    ],
  });
}

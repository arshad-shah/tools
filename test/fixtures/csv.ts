/** A synthetic CSV with `rows` data rows (id, name, city, amount, date). */
export function largeCsv(rows: number): Uint8Array {
  const cities = ['Dublin', 'Berlin', 'Paris', 'Madrid', 'Austin', 'Leeds'];
  const parts = ['id,name,city,amount,date\n'];
  for (let i = 1; i <= rows; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    parts.push(
      `${i},Name ${i},${cities[i % cities.length]},${((i * 37) % 10000) / 100},2024-03-${day}\n`,
    );
  }
  return new TextEncoder().encode(parts.join(''));
}

/**
 * Semicolon CSV saved as Windows-1252 without a BOM: byte 0x80 is the euro
 * sign and 0xE9 is e-acute, so a UTF-8 reading would fail.
 */
export function windows1252Csv(): Uint8Array {
  const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
  return Uint8Array.from([
    ...ascii('item;price\r\nCaf'),
    0xe9,
    ...ascii(';3,50 '),
    0x80,
    ...ascii('\r\nTea;2,00 '),
    0x80,
    ...ascii('\r\n'),
  ]);
}

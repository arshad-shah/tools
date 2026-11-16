/**
 * Renders LogoMark to public/favicon.svg. A static file has no stylesheet,
 * so the accent is written as its literal value.
 * Run through `pnpm icons:gen`; the output is committed and a unit test
 * checks it matches a fresh render.
 */
import { writeFile } from 'node:fs/promises';
import { faviconSvg } from './favicon';

await writeFile('public/favicon.svg', faviconSvg());

/**
 * Renders LogoMark to public/favicon.svg. A static file has no stylesheet,
 * so the token classes are replaced by the token values read from
 * src/theme/tokens.css (the single home of colour literals).
 * Run through `pnpm icons:gen`; the output is committed and a unit test
 * checks it matches a fresh render.
 */
import { writeFile } from 'node:fs/promises';
import { faviconSvg } from './favicon';

await writeFile('public/favicon.svg', faviconSvg());

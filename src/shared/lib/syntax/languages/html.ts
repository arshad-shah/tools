import { markup } from './markup';
import type { LanguageDef } from '../types';

/** HTML: the markup tokeniser (script and style bodies stay plain). */
export const html: LanguageDef = markup;

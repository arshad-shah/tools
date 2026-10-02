import { PunycodeError, idnToAscii, idnToUnicode } from '@/shared/lib/punycode';
import { CodecError, type Codec } from './codec';

/** Each `xn--` label back to Unicode; errors carry the host position. */
function decode(host: string): string {
  try {
    return idnToUnicode(host);
  } catch (e) {
    if (e instanceof PunycodeError) throw new CodecError(e.reason, e.position);
    throw e;
  }
}

/** The IDN codec over the shared RFC 3492 implementation. */
export const punycode: Codec = {
  id: 'punycode',
  label: 'Punycode (IDN)',
  about:
    'Internationalised domain names (RFC 3492): each label of a host name that is not plain ASCII is written as xn-- followed by its Punycode, and the dots are kept. bücher.example becomes xn--bcher-kva.example.',
  encode: idnToAscii,
  decode,
};

/** Bundled, in-house name and address data for one locale. */
export interface LocaleData {
  firstNames: readonly string[];
  lastNames: readonly string[];
  streets: readonly string[];
  cities: readonly string[];
  /** `#` is a random digit; other characters are kept. */
  phoneFormats: readonly string[];
  /** Postcode format: `#` digit, `A` capital letter; others kept. */
  postcodeFormats: readonly string[];
  /** House number before (`123 Main St`) or after (`Hauptstr. 12`). */
  numberFirst: boolean;
  country: string;
  countryCode: string;
  currencyCode: string;
  /** Domains used for email addresses and URLs. */
  domains: readonly string[];
}

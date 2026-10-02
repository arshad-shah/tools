export interface UrlFields {
  url: string;
}
export const urlPayload = ({ url }: UrlFields) => url.trim();

export interface TextFields {
  text: string;
}
export const textPayload = ({ text }: TextFields) => text;

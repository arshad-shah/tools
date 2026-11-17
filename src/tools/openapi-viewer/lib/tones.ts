type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent';

/** A badge tone per HTTP method, as the HTTP Client colours them. */
export function methodTone(method: string): Tone {
  switch (method) {
    case 'GET':
      return 'success';
    case 'POST':
      return 'accent';
    case 'PUT':
    case 'PATCH':
      return 'warning';
    case 'DELETE':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** A badge tone per response status class. */
export function statusTone(status: string): Tone {
  if (/^2/.test(status)) return 'success';
  if (/^3/.test(status)) return 'accent';
  if (/^4/.test(status)) return 'warning';
  if (/^5/.test(status)) return 'danger';
  return 'neutral';
}

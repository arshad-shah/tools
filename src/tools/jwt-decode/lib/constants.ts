export const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InNhbXBsZS1rZXkifQ.eyJzdWIiOiJ1c2VyLTEyMzQ1IiwibmFtZSI6IkphbmUgRG9lIiwiZW1haWwiOiJqYW5lQGV4YW1wbGUuY29tIiwiaWF0IjoxNzI2MjM5MDIyLCJleHAiOjE3NTc3NzUwMjIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6WyJhcGkuZXhhbXBsZS5jb20iLCJ3ZWIuZXhhbXBsZS5jb20iXSwicm9sZXMiOlsidXNlciIsIm1vZGVyYXRvciJdLCJwZXJtaXNzaW9ucyI6WyJyZWFkOnBvc3RzIiwid3JpdGU6cG9zdHMiLCJtb2RlcmF0ZTpjb21tZW50cyJdLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiZ3JvdXBzIjpbImRldmVsb3BlcnMiLCJiZXRhLXVzZXJzIl0sImN1c3RvbV9jbGFpbSI6eyJkZXBhcnRtZW50IjoiZW5naW5lZXJpbmciLCJ0ZWFtX2lkIjo0Mn19.Olk3AuFENIdCJiCYxGpglmauBWmLx42p7P3cjybazSI';

// The sample is really signed (HS256) so verification can be tried out.
export const SAMPLE_SECRET = 'sample-secret';

export const SECRET_ENCODINGS = [
  { value: 'text', label: 'Text (UTF-8)' },
  { value: 'base64', label: 'Base64' },
  { value: 'base64url', label: 'Base64url' },
];

export const KEY_TYPES = [
  { value: 'secret', label: 'Shared secret' },
  { value: 'pem', label: 'PEM public key' },
  { value: 'jwk', label: 'JWK or JWKS' },
];

/** A small stylesheet that shows off the preview and every panel. */
export const SAMPLE_CSS = `:root {
  --brand: #4f46e5;
  --radius: 12px;
}

body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}

.card {
  max-width: 360px;
  padding: 20px;
  border-radius: var(--radius);
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
  color: #1f2937;
}

.card .title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
}

.card p {
  margin: 0 0 16px;
  line-height: 1.5;
  color: #4b5563;
}

.card .button {
  display: inline-block;
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--brand);
  color: white;
  text-decoration: none;
}

.card .button:hover {
  background: #4338ca;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: 12px;
}

@media (max-width: 480px) {
  .card {
    padding: 14px;
  }
}
`;

/** Markup for the sample, used when "My HTML" is chosen with no HTML. */
export const SAMPLE_HTML = `<div class="card">
  <span class="badge">New</span>
  <h2 class="title">Hello, CSS</h2>
  <p>Paste your own stylesheet on the left to see it rendered here.</p>
  <a class="button" href="#">Get started</a>
</div>
`;

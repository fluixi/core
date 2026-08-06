/** `load:media` — desktop-only panel; a phone never downloads it. */
export function AuditLog() {
  return (
    <section class="panel">
      <h2>Audit log</h2>
      <p>Fetched only when the viewport is at least 1024px wide.</p>
    </section>
  );
}

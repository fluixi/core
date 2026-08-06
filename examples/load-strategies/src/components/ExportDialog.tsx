/** `load:interaction` — never fetched unless the user actually interacts. */
export function ExportDialog() {
  return (
    <section class="panel">
      <h2>Export</h2>
      <p>Fetched on your first pointer, focus or key event.</p>
    </section>
  );
}

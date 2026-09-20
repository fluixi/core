// The evidence panel. Shows which repository instance served this render and which
// request id the middleware assigned, so request isolation is visible in the page
// rather than only in a test.
export function RequestFacts(props: {
  viewer: string;
  requestId: string;
  servedBy: string;
}) {
  return (
    <dl class="facts">
      <dt>viewer</dt>
      <dd>{props.viewer}</dd>
      <dt>request id</dt>
      <dd>
        <code>{props.requestId}</code>
      </dd>
      <dt>served by</dt>
      <dd>
        <code>{props.servedBy}</code>
      </dd>
    </dl>
  );
}

export default RequestFacts;

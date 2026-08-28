import { Link } from '@fluixi/core/router';

/** The docs' two duplicating shapes: element children inside a Link. */
export function LinkChildrenApp() {
  return (
    <main id="lapp">
      <Link class="brand" href="/intro">
        <img class="logo" src="/m.png" alt="" /> Fluixi Docs
      </Link>
      <Link class="pager next" href="/next">
        <span class="lbl">Next →</span>
        <b class="ttl">Quick start</b>
      </Link>
    </main>
  );
}

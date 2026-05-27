import { sessionStore } from '../../../infrastructure/auth/session.store.js';

export function Topbar() {
  const user = () => sessionStore.user();

  return (
    <header class="admin-topbar">
      <div class="topbar-left">
        <h2 class="topbar-title">Admin Console</h2>
      </div>
      <div class="topbar-right">
        <div class="topbar-user">
          <div class="topbar-avatar">
            {() => {
              const u = user();
              return u?.photo_url
                ? <img src={u.photo_url} alt={u.display_name ?? u.email} class="avatar-img" />
                : <span class="avatar-initials">{(user()?.email?.[0] ?? 'A').toUpperCase()}</span>;
            }}
          </div>
          <div class="topbar-user-info">
            <span class="topbar-user-name">{() => user()?.display_name ?? user()?.email ?? 'Admin'}</span>
            <span class="topbar-user-role">Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}

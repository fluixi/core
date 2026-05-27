import { createSignal, createEffect } from '@awc/kettlejs';
import { useParams } from '@awc/kettlejs/router';
import { useAccount } from '../../../../../store/account.js';
import { accountsApi } from '../../../../../infrastructure/api/accounts.api.js';
import type { Account } from '@awc/helpers/accounts';

export default function AccountSettingsPage() {
  const params = useParams();
  const act    = useAccount();

  const [accountName, setAccountName] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [saveSuccess, setSaveSuccess] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);

  const [inviteEmail, setInviteEmail] = createSignal('');
  const [inviting, setInviting] = createSignal(false);
  const [inviteSuccess, setInviteSuccess] = createSignal(false);
  const [inviteError, setInviteError] = createSignal<string | null>(null);

  createEffect(() => {
    const account = act.account();
    if (account) {
      setAccountName(account.name);
    }
  });

  function handleSave(e: Event) {
    e.preventDefault();
    const accountId = params().id;
    if (!accountId) return;

    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    accountsApi
      .updateAccount(accountId, { name: accountName() })
      .then((updated: Account) => {
        act.select(updated);
        setSaveSuccess(true);
        setSaving(false);
      })
      .catch((err: Error) => {
        setSaveError(err.message ?? 'Failed to save changes.');
        setSaving(false);
      });
  }

  function handleInvite(e: Event) {
    e.preventDefault();
    const accountId = params().id;
    if (!accountId || !inviteEmail()) return;

    setInviting(true);
    setInviteSuccess(false);
    setInviteError(null);

    accountsApi
      .inviteMember(accountId, inviteEmail())
      .then(() => {
        setInviteSuccess(true);
        setInviteEmail('');
        setInviting(false);
      })
      .catch((err: Error) => {
        setInviteError(err.message ?? 'Failed to send invite.');
        setInviting(false);
      });
  }

  return (
    <div class="account-settings-page">
      <h1 class="page-title">Account Settings</h1>

      <section class="settings-section">
        <h2 class="settings-section-title">Account Info</h2>

        {() => act.isAdmin()
          ? (
            <form class="settings-form" onSubmit={handleSave}>
              <div class="form-field">
                <label class="form-label" for="account-name">Account Name</label>
                <input
                  id="account-name"
                  class="form-input"
                  type="text"
                  value={accountName()}
                  onInput={(e: InputEvent) => setAccountName((e.target as HTMLInputElement).value)}
                  required
                />
              </div>

              {() => saveSuccess() && (
                <p class="form-success">Changes saved successfully.</p>
              )}
              {() => saveError() && (
                <p class="form-error">{saveError()}</p>
              )}

              <button class="btn btn-primary" type="submit" disabled={saving()}>
                {() => saving() ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )
          : (
            <div class="settings-readonly">
              <p class="form-label">Account Name</p>
              <p class="settings-value">{() => act.account()?.name}</p>
            </div>
          )
        }
      </section>

      {() => act.isAdmin() && (
        <section class="settings-section">
          <h2 class="settings-section-title">Team Members</h2>
          <p class="settings-description">Invite a team member to this account by email.</p>

          <form class="settings-form" onSubmit={handleInvite}>
            <div class="form-field">
              <label class="form-label" for="invite-email">Email Address</label>
              <input
                id="invite-email"
                class="form-input"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail()}
                onInput={(e: InputEvent) => setInviteEmail((e.target as HTMLInputElement).value)}
                required
              />
            </div>

            {() => inviteSuccess() && (
              <p class="form-success">Invitation sent successfully.</p>
            )}
            {() => inviteError() && (
              <p class="form-error">{inviteError()}</p>
            )}

            <button class="btn btn-primary" type="submit" disabled={inviting()}>
              {() => inviting() ? 'Sending…' : 'Send Invite'}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

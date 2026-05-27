import { useEffect } from '@awc/kettlejs';
import { useNavigate } from '@awc/kettlejs/router';
import { sessionStore } from '../../../infrastructure/auth/session.store.js';
import { useAccount } from '../../../store/account.js';
import { ROUTES } from '../../../config/constants.js';
import { PageSpinner } from '../../../shared/components/ui/Spinner.js';
import type { Account } from '@awc/helpers/accounts';

export default function SelectAccountPage() {
  const navigate = useNavigate();
  const act      = useAccount();

  useEffect(() => {
    const user = sessionStore.user();
    if (!user) return;

    act.loadAccounts(user.uid!).then((all) => {
      if (all.length === 1) {
        act.select(all[0]);
        navigate(ROUTES.dashboard, { replace: true });
      }
    });
  });

  function handleSelect(account: Account) {
    act.select(account);
    navigate(ROUTES.dashboard, { replace: true });
  }

  function isEnabled(account: Account) {
    return account.status.toLowerCase() === 'enabled';
  }

  return (
    <main className="select-account-page flex flex-col items-center w-full">
      <div className="select-account-container w-full max-w-3xl p-4 md:p-8 flex flex-col justify-center items-center">
        <h1 className="select-account-title mb-4 md:mb-8 text-3xl md:text-4xl font-bold">Select an Account</h1>
        <p className="select-account-subtitle mb-8 md:mb-12 text-lg md:text-xl font-medium text-gray-600">
          Choose which ad account you want to work with.
        </p>

        {() => {
          if (act.loading()) return <PageSpinner />;
          if (act.error()) return (
            <div className="select-account-error">
              <p className="error-message">{act.error()}</p>
            </div>
          );
          if (act.accounts().length === 0) return (
            <p className="select-account-empty">No accounts found. Contact your administrator.</p>
          );
          return (
            <ul className="account-list list-none gap-2 flex flex-col w-full max-h-[500px] max-w-2xl shadow-lg dark:shadow overflow-y-auto border border-gray-200 dark:border-gray-900 cursor-pointer rounded-lg p-2 bg-app-tonal">
              {act.accounts().map((account) => (
                <li
                  key={account.id}
                  className="account-card p-2 md:p-4 rounded-lg  shadow border-gray-200 dark:border dark:border-gray-800 cursor-pointer hover:bg-[color:var(--color-bg-muted)]"
                  onClick={() => handleSelect(account)}
                >
                  <div className="account-card-header flex justify-between items-center">
                    <span className="account-name">{account.name}</span>
                    <span className="account-status inline-block w-[10px] h-[10px] rounded-full bg-green-500"></span>
                  </div>
                  <div className="account-card-footer">
                    <span className="account-value">
                      {account.account_value?.toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          );
        }}
      </div>
    </main>
  );
}

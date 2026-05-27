import { createSignal, createMemo, createContext, createProvider, useContext, batch } from '@awc/kettlejs';
import { SELECTED_ACCOUNT_KEY } from '../config/constants.js';
import { sessionStore } from '../infrastructure/auth/session.store.js';
import { accountsApi } from '../infrastructure/api/accounts.api.js';
import type { Account } from '@awc/helpers/accounts';

const [_account,  _setAccount]  = createSignal<Account | null>(
  JSON.parse(localStorage.getItem(SELECTED_ACCOUNT_KEY) ?? 'null'),
);
const [_accounts, _setAccounts] = createSignal<Account[]>([]);
const [_loading,  _setLoading]  = createSignal(false);
const [_error,    _setError]    = createSignal<string | null>(null);

export const accountStore = {
  /** Currently selected account. */
  account:  _account,
  /** Full list of accounts available to the signed-in user. */
  accounts: _accounts,
  /** True while `loadAccounts` is in-flight. */
  loading:  _loading,
  /** Error message from the last failed `loadAccounts` call. */
  error:    _error,

  isAdmin: createMemo(() => {
    const a = _account();
    const u = sessionStore.user();
    return !!a && !!u && (a.owner === u.uid || a.owner_email === u.email);
  }),

  /** Fetch the user's owned + linked accounts and populate `accounts`. */
  async loadAccounts(uid: string): Promise<Account[]> {
    _setLoading(true);
    _setError(null);
    try {
      const res = await accountsApi.listUserAccounts(uid);
      const all = [...(res.owned ?? []), ...(res.linked ?? [])];
      console.log('loaded', all)
      batch(()=>{
        _setAccounts(all);
        _setLoading(false);
        
      })
      return all;
    } catch (e) {
      _setError((e as Error).message ?? 'Failed to load accounts.');
      return [];
    } finally {
    }
  },

  /** Persist and activate an account. */
  select(account: Account): void {
    localStorage.setItem(SELECTED_ACCOUNT_KEY, JSON.stringify(account));
    _setAccount(account);
  },

  /** Deselect the current account (used on logout). */
  clear(): void {
    localStorage.removeItem(SELECTED_ACCOUNT_KEY);
    _setAccount(null);
    _setAccounts([]);
  },
} as const;

export const AccountContext = createContext<typeof accountStore>();

export function AccountProvider({ children }: { children?: any }) {
  return createProvider({ context: AccountContext, value: accountStore, children });
}

export function useAccount(): typeof accountStore {
  return useContext(AccountContext)!;
}

import { createSignal, useEffect } from '@awc/kettlejs';
import { useNavigate, useLocation } from '@awc/kettlejs/router';
import { ROUTES } from '../../../config/constants.js';
import { useAccount } from '../../../store/account.js';
import { sessionStore } from '../../../infrastructure/auth/session.store.js';
import { AccountsSelector } from '../ui/web-components.js';
import Sidenav from '../ui/webcomponents/sidenav.jsx';

interface NavItem {
  path:  string;
  label: string;
  icon_name:  string;
  icon_lib: string
}

const NAV_ITEMS: NavItem[] = [
  { path: ROUTES.dashboard, label: 'Dashboard', icon_name: 'layout-dashboard', icon_lib: "lucide" },
  { path: ROUTES.campaigns, label: 'Campaigns', icon_name: 'megaphone', icon_lib: "lucide" },
  { path: ROUTES.settings,  label: 'Settings',  icon_name: 'cog', icon_lib: "lucide" },
  // { path: ROUTES.dashboard, label: 'Dashboard', icon_name: '📊', icon_lib: "lucide" },
  // { path: ROUTES.campaigns, label: 'Campaigns', icon_name: '📣', icon_lib: "lucide" },
  // { path: ROUTES.settings,  label: 'Settings',  icon_name: '⚙️', icon_lib: "lucide" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const act      = useAccount();

  const [showSwitcher, setShowSwitcher] = createSignal(false);

  useEffect(() => {
    const user = sessionStore.user();
    if (!user || act.accounts().length > 0) return;
    act.loadAccounts(user.uid!);
  });

  function switchAccount(account: Parameters<typeof act.select>[0]) {
    act.select(account);
    setShowSwitcher(false);
    navigate(ROUTES.dashboard, { replace: true });
  }


  return (
        <Sidenav compact={true} opened={true} width={"18em"}>
          <Sidenav.Header class="sidebar-logo" showToggler={true} title={"Adafri"}>
            {/* <span class="sidebar-logo-icon">⚡</span> */}
            {/* <span class="sidebar-logo-text">Adafri</span> */}
          </Sidenav.Header>
          <Sidenav.Body>
  
              <div class="sidebar-account-switcher flex w-full py-2">
                <AccountsSelector
                  className="w-100"
                  searchSize={"md"}
                  accounts={act.accounts}
                  selected={()=>act.account()?.id!}
                  onChange={(e) => { act.select(e.value!); navigate(ROUTES.dashboard, { replace: true }); }}
                  // onChange={(e) => { console.log('accounts changed', e.value); }}
                  onLoaded={(e) => console.log('accounts loaded', e.value)}
                />
              </div>
                    {NAV_ITEMS.map(item => (
              <Sidenav.Item
                key={item.path}
                className={`sidebar-nav-item${location.pathname.startsWith(item.path) ? ' active' : ''}`}
                href={item.path}
                label={item.label}
                iconName={item.icon_name}
                lib={item.icon_lib}
                iSize={"md"}

                onClick={(e: Event) => { e.preventDefault(); navigate(item.path); }}
              >
                {/* <span class="nav-icon" aria-hidden="true" slot="icon">{item.icon}</span> */}
              </Sidenav.Item>
            ))}

          </Sidenav.Body>
          <Sidenav.Footer>
            {() => act.isAdmin() && (
              <Sidenav.Item
                class={`sidebar-nav-item${location.pathname.startsWith(`/accounts/${act.account()?.id}/settings`) ? ' active' : ''}`}
                href={`/accounts/${act.account()?.id}/settings`}
                label={"Account Settings"}
                lib={"lucide"}
                iconName={"brick-wall-shield"}
                onClick={(e: Event) => {
                  e.preventDefault();
                  navigate(`/accounts/${act.account()?.id}/settings`);
                }}
              >
                {/* <span class="nav-icon" aria-hidden="true">🏢</span> */}
              </Sidenav.Item>
            )}
          </Sidenav.Footer>
      </Sidenav>
    // <aside class="sidebar">
    //   <div class="sidebar-logo">
    //     <span class="sidebar-logo-icon">⚡</span>
    //     <span class="sidebar-logo-text">Adafri {act.loading() ? 'loading accounts' : 'accounts loaded'}</span>
    //   </div>
    //   {() => !act.loading() && (
    //     <div class="sidebar-account-switcher flex w-100 p-2">
    //       <AccountsSelector
    //         className="w-100"
    //         accounts={act.accounts()}
    //         selected={act.account()?.id}
    //         onChange={(e) => { act.select(e.value!); navigate(ROUTES.dashboard, { replace: true }); }}
    //         // onChange={(e) => { console.log('accounts changed', e.value); }}
    //         onLoaded={(e) => console.log('accounts loaded', e.value)}
    //       />
    //     </div>
    //   )}
      

    //   <div class="sidebar-account-switcher">
    //     <button
    //       class="account-switcher-trigger"
    //       onClick={() => setShowSwitcher(!showSwitcher())}
    //       aria-expanded={showSwitcher()}
    //       aria-haspopup="listbox"
    //     >
    //       <span class="account-switcher-name">
    //         {() => act.account()?.name ?? 'Select account'}
    //       </span>
    //       <span class="account-switcher-icon" aria-hidden="true">↕</span>
    //     </button>

    //     {() => showSwitcher() && act.accounts().length > 0 && (
    //       <ul class="account-switcher-dropdown" role="listbox">
    //         {act.accounts().map((account) => (
    //           <li
    //             key={account.id}
    //             class={`account-switcher-item${act.account()?.id === account.id ? ' active' : ''}`}
    //             role="option"
    //             aria-selected={act.account()?.id === account.id}
    //             onClick={() => switchAccount(account)}
    //           >
    //             {account.name}
    //           </li>
    //         ))}
    //       </ul>
    //     )}
    //   </div>

    //   <nav class="sidebar-nav" aria-label="Main navigation">
    //     {NAV_ITEMS.map(item => (
    //       <a
    //         key={item.path}
    //         class={`sidebar-nav-item${location.pathname.startsWith(item.path) ? ' active' : ''}`}
    //         href={item.path}
    //         onClick={(e: Event) => { e.preventDefault(); navigate(item.path); }}
    //       >
    //         <span class="nav-icon" aria-hidden="true">{item.icon}</span>
    //         <span class="nav-label">{item.label}</span>
    //       </a>
    //     ))}

    //     {() => act.isAdmin() && (
    //       <a
    //         class={`sidebar-nav-item${location.pathname.startsWith(`/accounts/${act.account()?.id}/settings`) ? ' active' : ''}`}
    //         href={`/accounts/${act.account()?.id}/settings`}
    //         onClick={(e: Event) => {
    //           e.preventDefault();
    //           navigate(`/accounts/${act.account()?.id}/settings`);
    //         }}
    //       >
    //         <span class="nav-icon" aria-hidden="true">🏢</span>
    //         <span class="nav-label">Account Settings</span>
    //       </a>
    //     )}
    //   </nav>
    // </aside>
  );
}

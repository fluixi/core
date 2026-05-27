import { Outlet, RouteDataArgs, useRouteData } from '@awc/kettlejs/router';
import { useAuthGuard, useAccountGuard } from '../../infrastructure/auth/route-guard.js';
import { Sidebar } from '../../shared/components/layout/Sidebar.js';
import { Topbar } from '../../shared/components/layout/Topbar.js';
import Drawer, { DrawerContent } from '../../shared/components/ui/webcomponents/drawer.jsx';
import { createCampaignActions, createCampaignResources, createCampaignsResources } from '../../domain/campaigns/campaign.service.js';
import { createAdgroupResources, createAdgroupsResources } from '../../domain/adgroups/adgroup.service.js';
import { GadsServiceProvider, GadsServiceValue } from '../../domain/adverising.context.js';
import { campaignStore } from '../../domain/campaigns/campaign.store.js';
import { useAccount } from '../../store/account.js';
import { Show } from '@awc/dom';
import { adGroupStore } from '../../domain/adgroups/adgroup.store.js';


export const routeData = (args: RouteDataArgs) => {
  const getParams =
  typeof args.params === 'function'
  ? (args.params as () => Record<string, string>)
  : () => args.params as Record<string, string>;
  
  console.log('on route data fetch', args)
  const account = useAccount();
  const id = ()=>({id: account.account()?.id})
  const adGroupid = ()=>({id: campaignStore.display.selected()?.id!})
  // select(getParams, 'workspaceId');

  // Core resources
  // const [workspace, { refetch: refetchWorkspace }] = createResource(id, fetchWorkspace);

  // Domain-specific resource factories
  const campaignsResource  = createCampaignsResources(id, "display");
  const campaignResource  = createCampaignResources(id, "display");
  const adgroupsResource  = createAdgroupsResources(adGroupid, "display");
  const adgroupResource  = createAdgroupResources(adGroupid, "display");

  return {
    id,
    display: {
      ...campaignsResource,
      ...adgroupsResource,
      ...campaignResource,
      ...adgroupResource
    }
  };
};

export type DashboardRouteData = ReturnType<typeof routeData>;

export default function AppLayout() {
  console.log('load dashboard layout')
  useAuthGuard();
  useAccountGuard();
  const data = useRouteData<DashboardRouteData>()
  const d = data()?.display
  

  const noop = () => {};
  const serviceValue: GadsServiceValue = {
      campaigns:  {
        display: {
          value: d?.campaign  ?? ((() => undefined) as any),
          campaigns: d?.campaigns  ?? ((() => undefined) as any),
          actions: createCampaignActions(d?.refetchCampaigns ?? noop, "display", campaignStore.display),
          ...d,
        },
      },
      adgroups: {} as any
  }
  return (
    <GadsServiceProvider value={serviceValue}>
              <Drawer>
                  <Topbar />
              <Sidebar></Sidebar>
            <DrawerContent>
                <div class="app-main">
                  <main class="app-content">
                    <Outlet />
                  </main>
                </div>
            </DrawerContent>
          </Drawer>
        {/* <Show when={data()}>
          {(d)=>{
            console.log('return loaded',d )
            return (
            )
          }}
        </Show> */}
    </GadsServiceProvider>
  )
  // return (
  //   <div class="app-layout">
  //     <Sidebar />
  //     <div class="app-main">
  //       <Topbar />
  //       <main class="app-content">
  //         <Outlet />
  //       </main>
  //     </div>
  //   </div>
  // );
}

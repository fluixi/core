import { createSignal, createEffect, createMemo, useEffect } from '@awc/kettlejs';
import { useParams, useNavigate, useParam, select } from '@awc/kettlejs/router';
import { campaignLinkApi } from '../../../../infrastructure/api/campaign-link.api.js';
import { apiClient } from '../../../../infrastructure/api/client.js';
import { workflowStore } from '../../../../domain/workflow/workflow.store.js';
import { wsUrl } from '../../../../config/constants.js';
import type { WorkflowCampaignLink } from '../../../../domain/workflow/campaign-link.model.js';
import {CAMPAIGN_DISPLAY_FIELDS} from "@awc/helpers/campaigns"
import Dialog from '../../../../shared/components/ui/webcomponents/dialog.jsx';
import Input from '../../../../shared/components/ui/webcomponents/input.jsx';
import List from '../../../../shared/components/ui/webcomponents/list.jsx';
import Button from '../../../../shared/components/ui/webcomponents/button.jsx';

export default function CampaignsPage() {
  console.log('CampaignsPage');
  const params   = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const wsId = useParam('workspaceId');

  const [links,        setLinks]        = createSignal<WorkflowCampaignLink[]>([]);
  const [campaigns,    setCampaigns]    = createSignal<any[]>([]);
  const [loading,      setLoading]      = createSignal(false);
  const [showLinkModal,setShowLinkModal]= createSignal(false, {internal: true, name: "modal"});
  const [searchTerm,   setSearchTerm]   = createSignal('');
  const [linking,      setLinking]      = createSignal(false);

  const isAdmin = createMemo(() => workflowStore.isAdmin());
  const ws = select(workflowStore.activeWorkspace)
  // const ws = createMemo(() => 
  //   {
  //   // const v = workflowStore.activeWorkspace()
  //   const v = s()
  //   console.log('active workspace memo', v)
  //   return {id: v?.id,
  //   accountId: v?.accountId}
  // });

  useEffect(() => {
    const val = ws()
    const id = val?.id;
    if (!id) return;
    setLoading(true);
    const account = val?.accountId;
    // const account = "Ya8ClS89iAqtBFrLfMNR";
    console.log('fetching', id, account)
    if(account){
      Promise.all([
        campaignLinkApi.listLinks(id),
        apiClient.get<any[]>(`/accounts/${account}/campaigns?fields=${CAMPAIGN_DISPLAY_FIELDS.join(',')}&limit=100`).catch(() => []),
      ]).then(([lks, cps]) => {
        console.log('fetch response', {lks, cps})
        setLinks(lks);
        setCampaigns(Array.isArray(cps) ? cps : []);
      }).catch(() => {})
        .finally(() => setLoading(false));

    }
  });

  useEffect(()=>{
    console.log('show link modal', showLinkModal())
  })
  const linkedCampaignIds = createMemo(() => new Set(links().map(l => l.campaignId)));

  const filteredCampaigns = createMemo(() =>
    campaigns().filter((c: any) =>
      !linkedCampaignIds().has(c.id) &&
      (c.name ?? '').toLowerCase().includes(searchTerm().toLowerCase()),
    ),
  );

  async function handleLink(campaignId: string) {
    setLinking(true);
    try {
      const link = await campaignLinkApi.linkCampaign(wsId(), campaignId);
      setLinks(prev => [...prev, link]);
      setShowLinkModal(false);
      setSearchTerm('');
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(linkId: string) {
    if (!confirm('Unlink this campaign from the workspace?')) return;
    await campaignLinkApi.unlinkCampaign(linkId);
    setLinks(prev => prev.filter(l => l.id !== linkId));
  }

  function getCampaignById(campaignId: string): any {
    return campaigns().find((c: any) => c.id === campaignId);
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-indigo-100 text-indigo-700',
  };

  function showDialog(){
    console.log('showing link dialog')
    setShowLinkModal(true)
    console.log('showing link dialog', showLinkModal())
  }

  return ()=>{
    // throw Error('render campaign')
    return (
    <div class="flex-1 overflow-y-auto bg-gray-50">
      <div class="max-w-5xl mx-auto px-8 py-8">

        <div class="mb-8 flex items-start justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Campaigns {showLinkModal() ? 'is show' : 'not show'}</h1>
            <p class="text-sm text-gray-500 mt-0.5">Campaigns linked to this workspace</p>
          </div>
          {() => (isAdmin() && !loading()) && (
            <div class="flex gap-2">
              <button
                class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                onClick={() => showDialog()}
              >
                Link Campaign
              </button>
            </div>
          )}
        </div>

        {/* Linked campaigns grid */}
        {() => loading()
          ? (
            <div class="grid grid-cols-2 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} class="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div class="h-4 w-40 bg-gray-200 rounded mb-2" />
                  <div class="h-3 w-24 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          )
          : ()=> links().length === 0
          ? (
            <div class="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-center">
              <span class="text-4xl mb-3">📢</span>
              <p class="text-gray-500 text-sm mb-4">No campaigns linked yet {showLinkModal() ? 'is show' : 'not show'}.</p>
              {()=>isAdmin() && (
                <button
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  onClick={(e: any) => showDialog()}
                >
                  Link a Campaign
                </button>
              )}
            </div>
          )
          : (
            <div class="grid grid-cols-2 gap-4">
              {()=>links().map(link => {
                const campaign = getCampaignById(link.campaignId);
                return (
                  <div
                    key={link.id}
                    class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(wsUrl(wsId(), `/campaigns/${link.campaignId}`))}
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="font-semibold text-gray-900 text-sm truncate">
                          {campaign?.name ?? link.campaignId}
                        </p>
                        {campaign?.status && (
                          <span class={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {campaign.status}
                          </span>
                        )}
                      </div>
                      {isAdmin() && (
                        <button
                          class="flex-shrink-0 text-xs text-red-500 hover:text-red-700 transition-colors"
                          onClick={(e: Event) => { e.stopPropagation(); handleUnlink(link.id); }}
                        >
                          Unlink
                        </button>
                      )}
                    </div>
                    {campaign && (
                      <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                        {campaign.budget != null && (
                          <div><span class="text-gray-400">Budget</span> ${campaign.budget?.toLocaleString()}</div>
                        )}
                        {campaign.objective && (
                          <div><span class="text-gray-400">Goal</span> {campaign.objective}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        }

        {/* Link campaign modal */}
          <Dialog showCloseIcon={true} opened={showLinkModal} onToggle={(e)=>{
            setShowLinkModal(e.opened)
          }}>
            <Dialog.Content class="w-full  max-w-lg">
                <Dialog.Header label={"Link Campaign"}></Dialog.Header>
                <Dialog.Body class="w-full">
                    <Input
                      type="text"
                      value={searchTerm}
                      onValueChange={(e) => setSearchTerm(e.value)}
                      placeholder="Search campaigns by name…"
                      class="w-full"
                      autoFocus
                    />
                    <div class="w-full max-h-64 overflow-y-auto space-y-2">
                      {() => filteredCampaigns().length === 0
                        ? <p class="text-sm text-gray-400 text-center py-4">No matching campaigns</p>
                        : (<List class="p-0">
                          <List.Body class="p-0">
                            {
                              filteredCampaigns().map((c) => (
                                <List.Item>
                                    <div
                                      class="flex items-center justify-between w-full"
                                      slot="label"
                                      // class="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                                    >
                                      <div>
                                        <p class="text-sm font-medium text-default">{c.name}</p>
                                        {c.status && (
                                          <span class={`text-xs px-1.5 py-0.5 rounded-full ${statusColors[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                            {c.status}
                                          </span>
                                        )}
                                      </div>
                                      <Button class="px-1.5" size={"sm"} color="primary" disabled={linking} onClick={() => handleLink(c.id)} label="Link" />
                                    </div>

                                </List.Item>
                            ))
                            }
                            
                          </List.Body>
                        </List>)
                      }
                    </div>
                </Dialog.Body>
            </Dialog.Content>
          </Dialog>
        {/* {() => showLinkModal() && (
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div class="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-900">Link Campaign</h2>
                <button
                  class="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => { setShowLinkModal(false); setSearchTerm(''); }}
                >
                  ✕
                </button>
              </div>
              <div class="p-6">
                <input
                  type="text"
                  value={searchTerm}
                  onInput={(e: InputEvent) => setSearchTerm((e.target as HTMLInputElement).value)}
                  placeholder="Search campaigns by name…"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                  autoFocus
                />
                <div class="max-h-64 overflow-y-auto space-y-2">
                  {() => filteredCampaigns().length === 0
                    ? <p class="text-sm text-gray-400 text-center py-4">No matching campaigns</p>
                    : filteredCampaigns().map((c: any) => (
                      <div
                        key={c.id}
                        class="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                      >
                        <div>
                          <p class="text-sm font-medium text-gray-900">{c.name}</p>
                          {c.status && (
                            <span class={`text-xs px-1.5 py-0.5 rounded-full ${statusColors[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {c.status}
                            </span>
                          )}
                        </div>
                        <button
                          class="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                          disabled={linking()}
                          onClick={() => handleLink(c.id)}
                        >
                          Link
                        </button>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </div>
  )
  };
}

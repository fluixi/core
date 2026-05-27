import { createSignal, createEffect, createMemo, useEffect } from '@awc/kettlejs';
import { useParams, useNavigate } from '@awc/kettlejs/router';
import { apiClient } from '../../../../../infrastructure/api/client.js';
import { campaignLinkApi } from '../../../../../infrastructure/api/campaign-link.api.js';
import { workflowStore } from '../../../../../domain/workflow/workflow.store.js';
import { wsUrl, ROUTES } from '../../../../../config/constants.js';
import { CAMPAIGN_DISPLAY_FIELDS } from '@awc/helpers/campaigns';

export default function CampaignDetailPage() {
  const params   = useParams<{ workspaceId: string; campaignId: string }>();
  const navigate = useNavigate();

  const wsId         = createMemo(() => params().workspaceId);
  const campaignId   = createMemo(() => params().campaignId);

  const [campaign,  setCampaign]  = createSignal<any>(null);
  const [link,      setLink]      = createSignal<any>(null);
  const [loading,   setLoading]   = createSignal(true);
  const [unlinking, setUnlinking] = createSignal(false);

  const isAdmin = createMemo(() => workflowStore.isAdmin?.() ?? false);

  useEffect(() => {
    const cid = campaignId();
    const wid = wsId();
    if (!cid || !wid) return;
    console.log('loading campaign', cid, wid);
    setLoading(true);
    Promise.all([
      apiClient.get<any>(`/gads/display/${cid}?fields=${CAMPAIGN_DISPLAY_FIELDS.join(',')}`).catch(() => null),
      campaignLinkApi.listLinks(wid),
    ]).then(([cp, links]) => {
      setCampaign(cp);
      const found = links.find((l: any) => l.campaignId === cid);
      setLink(found ?? null);
    }).catch(() => {})
      .finally(() => setLoading(false));
  });

  async function handleUnlink() {
    const l = link();
    if (!l) return;
    if (!confirm('Unlink this campaign from the workspace?')) return;
    setUnlinking(true);
    try {
      await campaignLinkApi.unlinkCampaign(l.id);
      navigate(wsUrl(wsId(), '/campaigns'));
    } finally {
      setUnlinking(false);
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <div class="flex-1 overflow-y-auto bg-gray-50">
      <div class="max-w-5xl mx-auto px-8 py-8">

        {/* Back nav */}
        <button
          class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
          onClick={() => navigate(wsUrl(wsId(), '/campaigns'))}
        >
          ← Back to Campaigns
        </button>

        {() => loading()
          ? (
            <div class="bg-white rounded-2xl border border-gray-200 p-8 animate-pulse space-y-4">
              <div class="h-6 w-48 bg-gray-200 rounded" />
              <div class="h-4 w-32 bg-gray-100 rounded" />
            </div>
          )
          : !campaign()
          ? (
            <div class="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-16 text-center">
              <span class="text-4xl mb-3">🔍</span>
              <p class="text-gray-500 text-sm">Campaign not found or no data available.</p>
            </div>
          )
          : (
            <div class="space-y-6">
              {/* Header */}
              <div class="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-6">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h1 class="text-2xl font-bold text-gray-900">{() => campaign().name ?? campaignId()}</h1>
                    {() => campaign().status && (
                      <span class={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[campaign().status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {campaign().status}
                      </span>
                    )}
                  </div>
                  <div class="flex items-center gap-3 flex-shrink-0">
                    <a
                      class="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
                      href={`/campaigns/${campaignId()}`}
                      onClick={(e: Event) => { e.preventDefault(); navigate(`/campaigns/${campaignId()}`); }}
                    >
                      Open Full Campaign ↗
                    </a>
                    {() => isAdmin() && link() && (
                      <button
                        class="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                        disabled={unlinking()}
                        onClick={handleUnlink}
                      >
                        {() => unlinking() ? 'Unlinking…' : 'Unlink from Workspace'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* KPI cards */}
              <div class="grid grid-cols-4 gap-4">
                {[
                  { label: 'Budget',      value: campaign().budget != null ? `$${Number(campaign().budget).toLocaleString()}` : '—' },
                  { label: 'Reach',       value: campaign().reach != null ? Number(campaign().reach).toLocaleString() : '—' },
                  { label: 'Clicks',      value: campaign().clicks != null ? Number(campaign().clicks).toLocaleString() : '—' },
                  { label: 'Conversions', value: campaign().conversions != null ? Number(campaign().conversions).toLocaleString() : '—' },
                ].map(kpi => (
                  <div key={kpi.label} class="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
                    <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{kpi.label}</p>
                    <p class="text-2xl font-bold text-gray-900">{() => kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Campaign details */}
              {() => campaign().objective && (
                <div class="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5">
                  <h2 class="text-sm font-semibold text-gray-900 mb-3">Campaign Details</h2>
                  <dl class="grid grid-cols-2 gap-4 text-sm">
                    {campaign().objective && (
                      <div>
                        <dt class="text-gray-500 text-xs font-medium uppercase tracking-wide">Objective</dt>
                        <dd class="text-gray-900 mt-0.5">{campaign().objective}</dd>
                      </div>
                    )}
                    {campaign().platform && (
                      <div>
                        <dt class="text-gray-500 text-xs font-medium uppercase tracking-wide">Platform</dt>
                        <dd class="text-gray-900 mt-0.5">{campaign().platform}</dd>
                      </div>
                    )}
                    {campaign().startDate && (
                      <div>
                        <dt class="text-gray-500 text-xs font-medium uppercase tracking-wide">Start Date</dt>
                        <dd class="text-gray-900 mt-0.5">{campaign().startDate}</dd>
                      </div>
                    )}
                    {campaign().endDate && (
                      <div>
                        <dt class="text-gray-500 text-xs font-medium uppercase tracking-wide">End Date</dt>
                        <dd class="text-gray-900 mt-0.5">{campaign().endDate}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          )
        }
      </div>
    </div>
  );
}

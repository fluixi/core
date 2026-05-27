import { createEffect, createSignal, useEffect } from '@awc/kettlejs';
import { useParams, useNavigate } from '@awc/kettlejs/router';
import { campaignService } from '../../../../domain/campaigns/campaign.service.js';
import { campaignStore } from '../../../../domain/campaigns/campaign.store.js';
import { adGroupService } from '../../../../domain/adgroups/adgroup.service.js';
import { adGroupStore } from '../../../../domain/adgroups/adgroup.store.js';
// import { workspaceService } from '../../../../domain/workflow/workflow.service.js';
import { workflowStore } from '../../../../domain/workflow/workflow.store.js';
import { useAccount } from '../../../../store/account.js';
import { StatusBadge } from '../../../../shared/components/ui/Badge.js';
import { Button } from '../../../../shared/components/ui/Button.js';
import { Card } from '../../../../shared/components/ui/Card.js';
import { Table, type Column } from '../../../../shared/components/ui/Table.js';
import { PageSpinner } from '../../../../shared/components/ui/Spinner.js';
import { fmtCurrency, fmtCompact, fmtPercent, fmtDate } from '../../../../shared/utils/format.js';
import type { AdGroup } from '../../../../domain/adgroups/adgroup.model.js';
import { ROUTES, wsUrl, adGroupsUrl, adGroupUrl } from '../../../../config/constants.js';
import type { WorkflowWorkspace } from '../../../../domain/workflow/workflow.model.js';

const WORKSPACE_COLS: Column<WorkflowWorkspace>[] = [
  { key: 'name',      header: 'Name',       render: w => w.name },
  { key: 'status',    header: 'Status',     render: w => <StatusBadge status={w.status} /> },
  { key: 'dueDate',   header: 'Due Date',   render: w => w.dueDate ? fmtDate(w.dueDate) : '—' },
  { key: 'createdAt', header: 'Created',    render: w => fmtDate(w.createdAt) },
];

const ADGROUP_COLS: Column<AdGroup>[] = [
  { key: 'name',        header: 'Ad Group',    render: g => g.name },
  { key: 'status',      header: 'Status',      render: g => <StatusBadge status={g.status} /> },
  { key: 'budget',      header: 'Budget',      render: g => fmtCurrency(g.budget),     align: 'right' },
  { key: 'spend',       header: 'Spend',       render: g => fmtCurrency(g.spend),      align: 'right' },
  { key: 'impressions', header: 'Impressions', render: g => fmtCompact(g.impressions), align: 'right' },
  { key: 'ctr',         header: 'CTR',         render: g => fmtPercent(g.ctr),         align: 'right' },
];

export default function CampaignDetailPage() {
  const params   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [creatingWs, setCreatingWs] = createSignal(false);

  useEffect(() => {
    const id        = params().id;
    // const accountId = accountStore.account()?.id;
    campaignService.get(id);
    adGroupService.listByCampaign(id);
    // if (accountId) campaignService.listByCampaign(accountId, id);
  });

  // async function handleNewWorkspace() {
  //   const id        = params().id;
  //   const accountId = accountStore.account()?.id;
  //   if (!accountId) return;
  //   setCreatingWs(true);
  //   try {
  //     const ws = await workspaceService.create(accountId, {
  //       campaignId: id,
  //       name:       `Workspace ${new Date().toLocaleDateString()}`,
  //     });
  //     navigate(wsUrl(ws.id));
  //   } finally {
  //     setCreatingWs(false);
  //   }
  // }

  const campaign = () => campaignStore.selected();

  return (
    <div class="page page-campaign-detail">
      {() => campaignStore.loading() && !campaign()
        ? <PageSpinner />
        : !campaign()
        ? (
          <div class="not-found">
            <p>Campaign not found.</p>
            <a href={ROUTES.campaigns} class="btn btn-secondary">← Back to Campaigns</a>
          </div>
        )
        : (
          <>
            <div class="page-header">
              <button
                class="btn btn-ghost btn-sm"
                type="button"
                onClick={() => navigate(ROUTES.campaigns)}
              >
                ← Campaigns
              </button>
              <div class="page-title-row">
                <h1 class="page-title">{campaign()!.name}</h1>
                <StatusBadge status={campaign()!.status} />
              </div>
              <div class="page-header-actions">
                {campaign()!.status !== 'archived' && (
                  <Button
                    label="Archive"
                    variant="ghost"
                    onClick={() => campaignService.archive(campaign()!.id)}
                  />
                )}
              </div>
            </div>

            <div class="detail-grid">
              <Card title="Overview">
                <dl class="detail-list">
                  <dt>Objective</dt>   <dd>{campaign()!.objective}</dd>
                  <dt>Budget</dt>      <dd>{fmtCurrency(campaign()!.budget)}</dd>
                  <dt>Start Date</dt>  <dd>{()=>{
                    console.log('cmp', campaign())
                    return fmtDate(campaign()!.startDate)
                  }}</dd>
                  {campaign()!.endDate && <><dt>End Date</dt><dd>{fmtDate(campaign()!.endDate!)}</dd></>}
                </dl>
              </Card>

              <Card title="Performance">
                <dl class="detail-list">
                  <dt>Spend</dt>       <dd>{fmtCurrency(campaign()!.costs!)}</dd>
                  <dt>Impressions</dt> <dd>{fmtCompact(campaign()!.impressions!)}</dd>
                  <dt>Clicks</dt>      <dd>{fmtCompact(campaign()!.clicks!)}</dd>
                  <dt>CTR</dt>         <dd>{fmtPercent(campaign()!.ctr!)}</dd>
                  <dt>CPC</dt>         <dd>{fmtCurrency(campaign()!.cpc)}</dd>
                  {/* <dt>ROAS</dt>        <dd>{campaign()!.roas.toFixed(2)}x</dd> */}
                </dl>
              </Card>
            </div>

            {/* <Card
              title="Workspaces"
              actions={
                <Button
                  label={creatingWs() ? 'Creating…' : 'New Workspace'}
                  variant="primary"
                  size="sm"
                  onClick={handleNewWorkspace}
                />
              }
            >
              {() => (
                <Table<WorkflowWorkspace>
                  columns={WORKSPACE_COLS}
                  rows={workflowStore.workspaces()}
                  keyField="id"
                  loading={workflowStore.wsLoading()}
                  empty="No workspaces yet."
                  onRowClick={ws => navigate(wsUrl(ws.id))}
                />
              )}
            </Card> */}

            <Card
              title="Ad Groups"
              actions={
                <Button
                  label="View All Ad Groups"
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(adGroupsUrl(campaign()!.id))}
                />
              }
            >
              {() => (
                <Table<AdGroup>
                  columns={ADGROUP_COLS}
                  rows={adGroupStore.items()}
                  keyField="id"
                  loading={adGroupStore.loading()}
                  empty="No ad groups yet."
                  onRowClick={g => navigate(adGroupUrl(campaign()!.id, g.id))}
                />
              )}
            </Card>
          </>
        )
      }
    </div>
  );
}

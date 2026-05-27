import { createEffect, html, useEffect } from '@awc/kettlejs';
import { useNavigate } from '@awc/kettlejs/router';
import { campaignStore } from '../../../domain/campaigns/campaign.store.js';
// import { Table, type Column } from '../../../shared/components/ui/Table.js';
import { LitBadge, StatusBadge } from '../../../shared/components/ui/Badge.js';
import { Button } from '../../../shared/components/ui/Button.js';
import { fmtCurrency, fmtCompact, fmtPercent, fmtDate } from '../../../shared/utils/format.js';
import type { CampaignDisplay } from '../../../domain/campaigns/campaign.model.js';
import { ROUTES, campaignUrl, workspaceUrl } from '../../../config/constants.js';
import { useAccount } from '../../../store/account.js';
import { Table } from '../../../shared/components/ui/web-components.js';
import { AdfTableOptions } from '@awc/adf-table';
import { useGadsService } from '../../../domain/adverising.context.js';

// const COLUMNS: Column<CampaignDisplay>[] = [
//   { key: 'name',        header: 'Campaign',    render: c => c.name, width: '25%' },
//   { key: 'status',      header: 'Status',      render: c => <StatusBadge status={c.status!} />, width: '10%' },
//   { key: 'objective',   header: 'Objective',   render: c => c.objective?.obj_id },
//   { key: 'budget',      header: 'Budget',      render: c => fmtCurrency(c.budget || 0),     align: 'right' },
//   { key: 'spend',       header: 'Spend',       render: c => fmtCurrency(c.costs || 0),      align: 'right' },
//   { key: 'impressions', header: 'Impressions', render: c => fmtCompact(c.impressions || 0), align: 'right' },
//   { key: 'clicks',      header: 'Clicks',      render: c => fmtCompact(c.clicks || 0),      align: 'right' },
//   { key: 'ctr',         header: 'CTR',         render: c => fmtPercent(c.ctr || 0),         align: 'right' },
// ];

export default function CampaignsPage() {
  const navigate = useNavigate();
  const act = useAccount()
  const campaignService = useGadsService()!
    const tableOptions: AdfTableOptions = {
        allowPaging: true,
        allowSorting: true,
        allowFiltering: true,
        selection: {
            type: 'checkbox',
            enable: true,
            comparator: {
                fields: ['id']
            }
        },
        paging: {
            pageSize: 5,
        },
        styling: {
          headerHeight: 40
        },
        columns: [
            {
                field: 'id',
                headerText: 'ID',
                // width: '100px',
                textAlign: 'Right',
                type: 'number',
                visible: false,
            },
            {
                field: 'name',
                headerText: 'Nom',
                sortable: true,
                template: (data)=>{
                  return html`<span @click=${(e: Event) => {
                    console.log('on click', e)
                      e.stopPropagation();
                      navigate(workspaceUrl(data.id!));
                    }}>${data.name}</span> as any`
                },
            },
            {
                field: 'status',
                headerText: 'Status',
                sortable: true,
                template: (data)=>{
                  return <StatusBadge status={data.status!} /> as any
                },
                width: '120px',
            },
            {
                field: 'startDate',
                headerText: 'Début',
                sortable: true,
                format(value) {
                  return fmtDate(value)
                },
              },
              {
                field: 'endDate',
                headerText: 'Fin',
                sortable: true,
                format(value) {
                  return fmtDate(value)
                },
            },
            {
                field: 'budget',
                headerText: 'Budget',
                format(value) {
                  return fmtCurrency(value)
                },
                sortable: true,
            },
            {
                field: 'clicks',
                headerText: 'Clics',
                sortable: true,
            },
            {
                field: 'impressions',
                headerText: 'Impressions',
                sortable: true,
            },
            {
                field: 'costs',
                headerText: 'Coûts',
                sortable: true,
            },
            {
                field: 'provider',
                headerText: 'View',
                sortable: false,
            },
        ],
    };

  useEffect(() => {
    console.log('act effect', campaignService)
    // campaignService?.campaigns?.display.actions.list({ limit: 20, accountId: act.account()!.id });
  });
  // useEffect(()=>{
  //   console.log('campaigns loaded',campaignStore.loading())
  // })

  return (
    <div class="flex-1 overflow-y-auto bg-app">
      <div class="max-w-6xl mx-auto px-8 py-8">
        <div class="flex items-center justify-between mb-7">
          <h1 class="text-title text-default">Campaigns {campaignStore.display.loading() ? 'loading': 'not loading'}</h1>
          <Button
            label="New Campaign"
            variant="primary"
            onClick={(e) => navigate(`${ROUTES.campaigns}/new`)}
          />
        </div>

        {campaignStore.display.loading() ? 'loading table' : 
        <Table options={tableOptions} data={campaignStore.display.items()}>
        </Table>
        }
        {/* {() => (
          <Table<CampaignDisplay>
            columns={[
              ...COLUMNS,
              {
                key: '_workspace',
                header: '',
                width: '110px',
                render: c => (
                  <Button
                    label="Workspace"
                    variant="secondary"
                    size="sm"
                    onClick={(e: Event) => {
                      e.stopPropagation();
                      navigate(workspaceUrl(c.id!));
                    }}
                  />
                ),
              },
            ]}
            rows={campaignStore.items()}
            keyField="id"
            loading={campaignStore.loading()}
            empty="No campaigns yet. Create your first one!"
            onRowClick={c => navigate(campaignUrl(c.id))}
          />
        )} */}
      </div>
    </div>
  );
}

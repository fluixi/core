import { createSignal } from '@awc/kettlejs';
import { useLocation, useNavigate } from '@awc/kettlejs/router';
import { wsUrl, ROUTES } from '../../../config/constants.js';
import { useWorkspaceService } from '../../../domain/workflow/service.context.js';
import Sidenav from '../ui/webcomponents/sidenav.jsx';
import Input from '../ui/webcomponents/input.jsx';
import Icon from '../ui/webcomponents/Icon.jsx';
import { Button } from '../ui/webcomponents/button.jsx';
import Switch from '../ui/webcomponents/switch.jsx';
import { useTheme } from '../../../store/theme.js';

interface Props {
  workspaceId: () => string;
}

export function WorkspaceSidebar({ workspaceId }: Props) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const service   = useWorkspaceService()!;
  const theme = useTheme()
  const { channelActions, documentActions, workflowStore, channelStore, documentStore, teamStore } = service;

  const [showAddChannel, setShowAddChannel] = createSignal(false);
  const [newChannelName, setNewChannelName] = createSignal('');
  const [addingChannel,  setAddingChannel]  = createSignal(false);
  const [newDocTitle,    setNewDocTitle]    = createSignal('');
  const [creatingDoc,    setCreatingDoc]    = createSignal(false);

  function isActive(path: string, exact = false): boolean {
    return exact ? location.pathname === path : location.pathname.startsWith(path);
  }

  function navItem(path: string, exact = false) {
    return `sidebar-item${isActive(path, exact) ? ' active' : ''}`;
  }

  async function handleAddChannel(e: Event) {
    e.preventDefault();
    const name = newChannelName().trim();
    if (!name) return;
    setAddingChannel(true);
    try {
      await channelActions.create({ workspaceId: workspaceId(), name });
      setNewChannelName('');
      setShowAddChannel(false);
    } finally {
      setAddingChannel(false);
    }
  }

  async function handleNewDoc(e: Event) {
    e.preventDefault();
    const title = newDocTitle().trim() || 'Untitled';
    setCreatingDoc(true);
    try {
      const doc = await documentActions.create({ workspaceId: workspaceId(), title, icon: '📄' });
      setNewDocTitle('');
      navigate(wsUrl(workspaceId(), `/docs/${doc.id}`));
    } finally {
      setCreatingDoc(false);
    }
  }

  return (
    <Sidenav compact={true} className="max-w-60 overflow-hidden border-r border-subtle" opened={true}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <Sidenav.Header showToggler={true} title={workflowStore.activeWorkspace()?.name ?? 'Workspace'}>
          <div class="px-3 py-3 flex-shrink-0" slot="title">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-subheading text-sidebar-active truncate leading-snug">
                  {() => workflowStore.activeWorkspace()?.name ?? 'Workspace'}
                </p>
                {() => {
                  const ws = workflowStore.activeWorkspace();
                  if (!ws) return null;
                  const statusColors: Record<string, string> = {
                    draft: 'text-faint', in_review: 'text-warning',
                    approved: 'text-success', live: 'text-brand', completed: 'text-muted',
                  };
                  const labels: Record<string, string> = {
                    draft: 'Draft', in_review: 'In Review',
                    approved: 'Approved', live: 'Live', completed: 'Completed',
                  };
                  return (
                    <span class={`text-caption ${statusColors[ws.status] ?? 'text-faint'} mt-0.5 inline-block`}>
                      {labels[ws.status] ?? ws.status}
                    </span>
                  );
                }}
              </div>
            </div>
          </div>
        </Sidenav.Header>
        <Sidenav.Body class="items-start">

            {/* WORKSPACE */}
            <Sidenav.Item static={true} class='p-0'>
              <div slot="label" class="sidebar-section-label">Workspace</div>
            </Sidenav.Item>

            {() => {
              const base = wsUrl(workspaceId());
              return (
                <>
                  <Sidenav.Item
                   class={navItem(base, true)} href={base}
                    onClick={(e: Event) => { e.preventDefault(); navigate(base); }}>
                    <span class="nav-icon" slot='icon'>📋</span> 
                    <span class="nav-label" slot='label'>Overview</span> 
                  </Sidenav.Item>
                  <Sidenav.Item class={navItem(`${base}/scenarios`)} href={`${base}/scenarios`}
                    onClick={(e: Event) => { e.preventDefault(); navigate(`${base}/scenarios`); }}>
                    <span class="nav-icon" slot='icon'>🎯</span> 
                    <span class="nav-item" slot="label">Scenarios</span>
                  </Sidenav.Item>
                  <Sidenav.Item class={navItem(`${base}/creatives`)} href={`${base}/creatives`}
                    onClick={(e: Event) => { e.preventDefault(); navigate(`${base}/creatives`); }}>
                    <span class="nav-icon" slot='icon'>🖼️</span> 
                    <span class="nav-icon" slot='label'>
                      Creatives
                    </span> 
                  </Sidenav.Item>
                  <Sidenav.Item class={navItem(`${base}/campaigns`)} href={`${base}/campaigns`}
                    onClick={(e: Event) => { e.preventDefault(); navigate(`${base}/campaigns`); }}>
                    <span class="nav-icon" slot='icon'>📢</span> 
                    <span class="nav-icon" slot='label'>
                      Campaigns
                    </span>
                  </Sidenav.Item>
                </>
              );
            }}

            <div class="sidebar-divider" />

            {/* MESSAGING */}
            <Sidenav.Item static={true} class='p-0'>
                <div class="sidebar-section-label" slot='label'>
                  Messaging
                  {() => channelStore.channels().length > 0 && (
                    <span style="margin-left: 4px; opacity: 0.5;">{channelStore.channels().length}</span>
                  )}
                </div>
            </Sidenav.Item>

            {() => channelStore.channels().map(ch => {
              const base = wsUrl(workspaceId());
              const isPrivate = (ch.allowedTeamIds?.length ?? 0) > 0 || (ch.allowedMemberUids?.length ?? 0) > 0;
              return (
                <Sidenav.Item
                  key={ch.id}
                  class={navItem(`${base}/messaging/${ch.id}`)}
                  href={`${base}/messaging/${ch.id}`}
                  onClick={(e: Event) => { e.preventDefault(); navigate(`${base}/messaging/${ch.id}`); }}
                >
                  <span slot="icon" class="text-faint font-mono" style="font-size:11px;">#</span>
                  <span slot="label" class="truncate flex-1">{ch.name}</span>
                  {isPrivate && <span class="text-faint" style="font-size:10px;" title="Restricted">🔒</span>}
                </Sidenav.Item>
              );
            })}

            {() => showAddChannel()
              ? (
                  <form class="contents" onSubmit={handleAddChannel}>
                    <Sidenav.Item static={true} class='p-0'>
                      <Input
                        flat
                        slot="label"
                        type="text"
                        value={newChannelName()}
                        onChange={(e) => setNewChannelName(e.value)}
                        placeholder="channel-name"
                        class="w-full text-body-sm placeholder-[var(--color-text-faint)] text-default mb-1.5"
                        autoFocus
                      />
                    </Sidenav.Item>
                    {/* <input
                      type="text"
                      value={newChannelName()}
                      onInput={(e: InputEvent) => setNewChannelName((e.target as HTMLInputElement).value)}
                      placeholder="channel-name"
                      class="w-full text-body-sm bg-surface border border-subtle rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand placeholder-[var(--color-text-faint)] text-default mb-1.5"
                      autoFocus
                    /> */}
                    <Sidenav.Item static={true} class='p-0'>
                        <div class="flex gap-1.5" slot='label'>
                          <button
                            type="submit"
                            class="flex-1 text-caption py-1 bg-brand hover:opacity-90 text-white rounded transition-opacity disabled:opacity-50"
                            disabled={addingChannel()}
                          >
                            {() => addingChannel() ? '…' : 'Add'}
                          </button>
                          <button
                            type="button"
                            class="sidebar-item flex-1 text-caption py-1 text-center"
                            onClick={() => setShowAddChannel(false)}
                          >Cancel</button>
                        </div>
                    </Sidenav.Item>
                  </form>
              )
              : (
                <Sidenav.Item static={true} class='p-0'>
                    <Button
                        slot="label"
                        iName={"plus"}
                        lib={"lucide"}
                        strokeWidth={.5}
                        iSize={18}
                        className="w-full"
                        onClick={(e) => { setShowAddChannel(true)}}
                        label={"Add channel"}
                      >
                      </Button>
                </Sidenav.Item>
              )
            }

            <div class="sidebar-divider" />

            {/* DOCS */}
            <Sidenav.Item static={true} class='p-0'>
              <div slot="label" class="sidebar-section-label">Docs</div>
            </Sidenav.Item>

            {() => {
              const base = wsUrl(workspaceId());
              return documentStore.docs().map(doc => (
                <Sidenav.Item
                  key={doc.id}
                  class={navItem(`${base}/docs/${doc.id}`)}
                  href={`${base}/docs/${doc.id}`}
                  onClick={(e: Event) => { e.preventDefault(); navigate(`${base}/docs/${doc.id}`); }}
                >
                  <span slot="icon" class="nav-icon">{doc.icon}</span>
                  <span slot="label" class="truncate flex-1">{doc.title || 'Untitled'}</span>
                </Sidenav.Item>
              ));
            }}
            <Sidenav.Item static={true} lib="lucide" iName={"plus"} size="14" strokeWidth={.5}>
              {/* <Icon slot='icon' lib="lucide" iName={"plus"} size="14" strokeWidth={.5}/> */}
              <form slot="label" class="flex flex-col gap-2" onSubmit={handleNewDoc}>
                <Input  
                  ghost
                  styled={false}
                  value={newDocTitle()}
                  onValueChange={(e) => setNewDocTitle(e.value)}
                />

                {/* <input
                  type="text"
                  placeholder="+ New doc"
                  class="w-full text-caption bg-transparent text-sidebar placeholder-[var(--sidebar-text)] focus:outline-none px-2.5 py-1.5 rounded hover:bg-[var(--sidebar-hover)] transition-colors"
                /> */}
              </form>
              <div class="flex gap-1.5" slot="label">
                <button
                  type="submit"
                  class="flex-1 text-caption py-1 bg-brand hover:opacity-90 text-white rounded transition-opacity disabled:opacity-50"
                  disabled={creatingDoc()}
                >
                  {() => creatingDoc() ? '…' : 'Add'}
                </button>
              </div>
            </Sidenav.Item>


            {/* Spacer */}
            <div class="flex-1" />

            <div class="sidebar-divider" />

            {/* BOTTOM */}
        </Sidenav.Body>
        <Sidenav.Footer class="flex-col">
            {() => {
              const base = wsUrl(workspaceId());
              return (
                <>
                  <Sidenav.Item class={navItem(`${base}/members`)} href={`${base}/members`}
                    label={"Members"}
                    onClick={(e: Event) => { e.preventDefault(); navigate(`${base}/members`); }}>
                    <span class="nav-icon" slot="icon">👥</span>
                  </Sidenav.Item>
                  <Sidenav.Item class={navItem(`${base}/teams`)} href={`${base}/teams`}
                    onClick={(e: Event) => { e.preventDefault(); navigate(`${base}/teams`); }}>
                    <span class="nav-icon" slot="icon">🏷️</span>
                    <span class="flex-1" slot="label">Teams</span>
                    {() => teamStore.teams().length > 0 && (
                      <span class="text-label opacity-50">{teamStore.teams().length}</span>
                    )}
                  </Sidenav.Item>
                  <Sidenav.Item label="Settings" class={navItem(`${base}/settings`)} href={`${base}/settings`}
                    onClick={(e: Event) => { e.preventDefault(); navigate(`${base}/settings`); }}>
                    <span class="nav-icon" slot="icon">⚙️</span>
                  </Sidenav.Item>
                </>
              );
            }}
          <Sidenav.Item class="sidebar-item" label={"Back to Campaigns"} 
          iName={"arrow-big-left"} lib={"lucide"}
          size={"16"}
          onClick={() => navigate(ROUTES.campaigns)}>
          </Sidenav.Item>
          <Sidenav.Item class="sidebar-item" label={"Theme"} 
          iName={"palette"} lib={"internal"}
          iVariant={"outline"}
          iSize={"16"}>
            <Switch slot='label' label={theme.theme()} checked={theme.theme()==='dark'} onChange={(e)=>{
              theme.toggle()
            }}></Switch>
          </Sidenav.Item>
        </Sidenav.Footer>
        {/* ── Nav ────────────────────────────────────────────────── */}
        {/* <nav class="flex flex-col flex-1 overflow-y-auto py-1 gap-0">

        </nav> */}

    </Sidenav>
  );
}

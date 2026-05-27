import { useEffect } from '@awc/kettlejs';
import { useParams, useNavigate } from '@awc/kettlejs/router';
import { useWorkspaceService } from '../../../../domain/workflow/service.context.js';
import { wsUrl } from '../../../../config/constants.js';

export default function MessagingRedirectPage() {
  const params   = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const service  = useWorkspaceService()!;

  useEffect(() => {
    const channels = service.channelStore.channels();
    if (!channels.length) return;
    const general = channels.find(c => c.slug === 'general') ?? channels[0];
    navigate(wsUrl(params().workspaceId, `/messaging/${general.id}`), { replace: true });
  });

  return (
    <div class="flex-1 flex items-center justify-center bg-app">
      <div class="text-center">
        <div class="spinner spinner-sm mx-auto mb-3" />
        <p class="text-caption text-muted">Loading channels…</p>
      </div>
    </div>
  );
}

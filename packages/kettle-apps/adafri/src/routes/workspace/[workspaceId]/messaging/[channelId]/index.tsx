import { useParam } from '@awc/kettlejs/router';
import { ChannelView } from '../../../../../shared/components/workspace/ChannelView.jsx';

export default function ChannelPage() {
  // useParam returns a memo that only re-triggers when channelId itself changes,
  // not when other params in the same URL change.
  const channelId = useParam('channelId') as () => string;
  return (
    <div class="flex-1 flex flex-col overflow-hidden">
      <ChannelView channelId={channelId} />
    </div>
  );
}

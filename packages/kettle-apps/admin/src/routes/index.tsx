import { useNavigate } from '@awc/kettlejs/router';
import { useEffect } from '@awc/kettlejs';

export default function IndexPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/dashboard', { replace: true });
  });

  return <div />;
}

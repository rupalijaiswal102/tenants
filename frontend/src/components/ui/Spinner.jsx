import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 28, fullPage = false, minHeight = '60vh' }) {
  const el = (
    <Loader2 size={size} color="#f97316" style={{ animation: 'spin 1s linear infinite' }}/>
  );
  if (!fullPage) return el;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight }}>
      {el}
    </div>
  );
}

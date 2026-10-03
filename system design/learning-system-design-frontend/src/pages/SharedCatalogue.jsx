import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cataloguesAPI } from '../api/catalogues';
const SharedCatalogue = () => {
  const { shareLink } = useParams();
  const [catalogue, setCatalogue] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    cataloguesAPI.getCatalogueByLink(shareLink).then(data => { if (!cancelled) setCatalogue(data); }).catch(e => { if (!cancelled) setError(e.response?.data?.error || 'This catalogue is not available.'); });
    return () => { cancelled = true; };
  }, [shareLink]);
  return <main className="shared-catalogue" style={{ maxWidth: 900, margin: '32px auto', padding: 24 }}>
    {error ? <p role="alert">{error}</p> : !catalogue ? <p>Loading catalogue…</p> : <>
      <h1>{catalogue.companyName}</h1><h2>{catalogue.title}</h2><p>{catalogue.description}</p>
      <button className="btn" onClick={() => window.print()}>Print / save PDF</button>
      {catalogue.items.map(item => <article className="card" style={{ padding: 20, marginTop: 16 }} key={item.id}>
        <h3>{item.product?.name}</h3><p>{item.product?.sku}</p><p>₹{Number(item.product?.basePrice || 0).toLocaleString('en-IN')}</p>
      </article>)}
    </>}
  </main>;
};
export default SharedCatalogue;

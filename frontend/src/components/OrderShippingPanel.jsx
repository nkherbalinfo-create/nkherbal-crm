import { useState } from 'react';
import api from '../utils/api';
import { useToast } from './Toast';

// Confirmation + Delhivery status shown in the order view, with the actions the team needs.
export const CONFIRM_LABEL = {
  none: { text: 'Not sent', chip: 'chip-muted' },
  sent: { text: 'Waiting for customer', chip: 'chip-warn' },
  order_confirmed: { text: 'Order confirmed · checking address', chip: 'chip-info' },
  awaiting_address: { text: 'Waiting for address', chip: 'chip-warn' },
  address_confirmed: { text: 'Confirmed by customer', chip: 'chip-ok' },
  needs_call: { text: 'Needs a call', chip: 'chip-danger' },
  cancelled: { text: 'Cancelled', chip: 'chip-muted' }
};

// Compact chip for the orders table: shipment first, then confirmation state.
export function ShipChip({ order }) {
  const d = order.delhivery || {};
  const c = order.confirmation?.status || 'none';
  if (d.status === 'created' && d.awb) return <span className="chip chip-ok" style={{ fontSize: 10 }} title={`AWB ${d.awb}`}>AWB {d.awb.slice(-6)}</span>;
  if (d.status === 'failed') return <span className="chip chip-danger" style={{ fontSize: 10 }} title={d.error}>Delhivery failed</span>;
  if (d.status === 'dry_run') return <span className="chip chip-info" style={{ fontSize: 10 }}>Shipment (test)</span>;
  if (c === 'none') return null;
  const l = CONFIRM_LABEL[c] || CONFIRM_LABEL.none;
  return <span className={`chip ${l.chip}`} style={{ fontSize: 10 }}>{l.text}</span>;
}

const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const label = { fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--faint)', marginBottom: 8 };

export default function OrderShippingPanel({ order, onUpdated }) {
  const { addToast } = useToast();
  const [busy, setBusy] = useState('');
  const [editing, setEditing] = useState(false);
  const s = order.shipping || {};
  const [form, setForm] = useState({ name: s.name || order.customerName || '', phone: s.phone || order.mobile || '', address: s.address || '', city: s.city || '', state: s.state || '', pincode: s.pincode || '' });
  const c = order.confirmation || {};
  const d = order.delhivery || {};
  const status = CONFIRM_LABEL[c.status || 'none'] || CONFIRM_LABEL.none;
  const total = Number(order.orderValue) || 0;
  const cod = order.partialCod?.balance ?? (order.paymentStatus === 'COD' ? total : 0);
  const paid = order.partialCod?.deposit ?? (total - cod);

  const run = async (key, fn, okText) => {
    setBusy(key);
    try {
      const { data } = await fn();
      if (okText) addToast(typeof okText === 'function' ? okText(data) : okText, 'success');
      onUpdated?.(data.order || data);
      return data;
    } catch (err) {
      addToast(err.response?.data?.message || err.message, 'error');
      if (err.response?.data?.order) onUpdated?.(err.response.data.order);
    } finally { setBusy(''); }
  };

  const saveAddress = () => run('address', () => api.put(`/automation/orders/${order._id}/shipping`, form), 'Address saved')
    .then(r => { if (r) setEditing(false); });
  const sendConfirmation = () => run('send', () => api.post(`/automation/orders/${order._id}/send-confirmation`, { force: true }),
    data => data.result === 'sent' ? 'WhatsApp confirmation sent' : `Not sent: ${data.result}`);
  const markConfirmed = () => run('mark', () => api.put(`/automation/orders/${order._id}/confirmation`, { status: 'address_confirmed', note: 'Confirmed on call' }), 'Marked as confirmed');
  const createShipment = () => run('ship', () => api.post(`/automation/orders/${order._id}/delhivery`),
    data => data.result?.awb ? `Delhivery order created · AWB ${data.result.awb}` : 'Shipment built (test mode — nothing created in Delhivery)');

  const field = (k, ph, wide) => (
    <input className="input" value={form[k]} placeholder={ph} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
      style={{ gridColumn: wide ? '1 / -1' : undefined, fontSize: 12.5 }} />
  );

  return (
    <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={label}>Confirmation &amp; Delhivery</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
        <span className={`chip ${status.chip}`}>{status.text}</span>
        {c.note && c.status === 'needs_call' && <span style={{ color: 'var(--danger)' }}>{c.note}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12 }}>
        {[['Order total', total], ['Paid online', paid], ['Cash to collect', cod]].map(([t, v]) => (
          <div key={t} style={{ background: 'var(--bg)', borderRadius: 9, padding: '8px 12px' }}>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>{t}</div>
            <div style={{ fontWeight: 600, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{inr(v)}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg)', borderRadius: 9, padding: '10px 14px', fontSize: 12.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: 'var(--faint)', fontSize: 11 }}>Delivery address{c.addressConfirmedAt ? ' · confirmed' : ''}</span>
          {!editing && <button className="btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setEditing(true)}>Edit</button>}
        </div>
        {editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {field('name', 'Name')}{field('phone', 'Phone')}
            {field('address', 'House, street, area', true)}
            {field('city', 'City')}{field('state', 'State')}{field('pincode', 'Pincode')}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', gridColumn: '1 / -1' }}>
              <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn-primary" style={{ fontSize: 12 }} disabled={busy === 'address'} onClick={saveAddress}>Save address</button>
            </div>
          </div>
        ) : s.address ? (
          <div style={{ color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{s.name || order.customerName}</span>
            <span>{s.address}</span>
            <span>{[s.city, s.state].filter(Boolean).join(', ')}{s.pincode ? ` - ${s.pincode}` : ''}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{s.phone || order.mobile}</span>
          </div>
        ) : <div style={{ color: 'var(--faint)' }}>No delivery address yet{order.billingAddress ? ' — billing address will be used' : ''}</div>}
      </div>

      {(d.status && d.status !== 'none') && (
        <div style={{ fontSize: 12.5, color: d.status === 'failed' ? 'var(--danger)' : 'var(--muted)' }}>
          {d.status === 'created' && <>Delhivery AWB <b style={{ color: 'var(--fg)' }}>{d.awb}</b> · COD {inr(d.codAmount)} · value {inr(d.declaredValue)} · <a href={`https://www.delhivery.com/track-v2/package/${d.awb}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Track</a></>}
          {d.status === 'dry_run' && <>Test mode: shipment built (COD {inr(d.codAmount)}, value {inr(d.declaredValue)}) but not sent to Delhivery.</>}
          {d.status === 'failed' && <>Delhivery error: {d.error}</>}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
        {order.salesChannel === 'Website' && ['none', 'sent', 'needs_call'].includes(c.status || 'none') && (
          <button className="btn-secondary" style={{ fontSize: 12 }} disabled={!!busy} onClick={sendConfirmation}>
            {busy === 'send' ? 'Sending…' : (c.status && c.status !== 'none' ? 'Re-send WhatsApp confirmation' : 'Send WhatsApp confirmation')}
          </button>
        )}
        {['sent', 'order_confirmed', 'awaiting_address', 'needs_call'].includes(c.status) && (
          <button className="btn-secondary" style={{ fontSize: 12 }} disabled={!!busy} onClick={markConfirmed}>Mark confirmed (after call)</button>
        )}
        {d.status !== 'created' && c.status !== 'cancelled' && (
          <button className="btn-primary" style={{ fontSize: 12 }} disabled={!!busy} onClick={createShipment}>
            {busy === 'ship' ? 'Creating…' : 'Create Delhivery order'}
          </button>
        )}
      </div>
    </div>
  );
}

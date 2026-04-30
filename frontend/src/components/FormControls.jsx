import { Children, isValidElement, useEffect, useRef, useState } from 'react';

const isoToDisplay = (value) => {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  if (!y || !m || !d) return value;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toIso = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function DateInput({ value, onChange, placeholder = 'dd-mm-yyyy', style, ...props }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null;
  const [viewDate, setViewDate] = useState(selected || new Date());
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (selected && !Number.isNaN(selected.getTime())) setViewDate(selected);
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const todayIso = toIso(new Date());
  const selectedIso = selected && !Number.isNaN(selected.getTime()) ? toIso(selected) : '';
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const moveMonth = (delta) => setViewDate(new Date(year, month + delta, 1));

  return (
    <div className="date-picker" ref={ref}>
      <button
        {...props}
        type="button"
        className="input app-date-input"
        onClick={() => setOpen((v) => !v)}
        style={style}
      >
        <span>{value ? isoToDisplay(value) : placeholder}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </svg>
      </button>
      {open && (
        <div className="date-popover">
          <div className="date-popover-head">
            <button type="button" className="date-nav" onClick={() => moveMonth(-1)} aria-label="Previous month">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="date-month">{monthLabel}</div>
            <button type="button" className="date-nav" onClick={() => moveMonth(1)} aria-label="Next month">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
          <div className="date-weekdays">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="date-grid">
            {days.map((d) => {
              const iso = toIso(d);
              const muted = d.getMonth() !== month;
              const active = iso === selectedIso;
              const today = iso === todayIso;
              return (
                <button
                  type="button"
                  key={iso}
                  className={`date-day${muted ? ' muted' : ''}${active ? ' active' : ''}${today ? ' today' : ''}`}
                  onClick={() => { onChange(iso); setOpen(false); }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="date-popover-foot">
            <button type="button" onClick={() => onChange('')}>Clear</button>
            <button type="button" onClick={() => { onChange(todayIso); setOpen(false); }}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterBar({ children, style }) {
  return (
    <div className="filter-card" style={style}>
      <div className="filter-row">{children}</div>
    </div>
  );
}

export function SelectInput({ children, style, triggerStyle, ...props }) {
  const { value = '', onChange, placeholder } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => ({
      value: child.props.value ?? child.props.children,
      label: child.props.children,
      disabled: child.props.disabled,
    }));
  const selected = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (opt) => {
    if (opt.disabled) return;
    onChange?.({ target: { value: opt.value } });
    setOpen(false);
  };

  return (
    <div className="custom-select" ref={ref} style={style}>
      <button
        type="button"
        className="input app-select-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={triggerStyle}
      >
        <span>{selected?.label || placeholder || 'Select'}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="select-popover" role="listbox">
          {options.map((opt) => (
            <button
              type="button"
              key={`${opt.value}-${opt.label}`}
              className={`select-option${String(opt.value) === String(value) ? ' active' : ''}`}
              disabled={opt.disabled}
              onClick={() => choose(opt)}
              role="option"
              aria-selected={String(opt.value) === String(value)}
            >
              <span>{opt.label}</span>
              <span className="select-check">
              {String(opt.value) === String(value) && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

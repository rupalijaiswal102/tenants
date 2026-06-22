import { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * RightPanel — slides in from the right side of screen.
 *
 * Props:
 *   isOpen      boolean
 *   onClose     fn
 *   title       string
 *   subtitle    string (optional)
 *   icon        ReactNode (optional) — shown in header icon box
 *   iconBg      string (optional) — hex/tailwind bg for icon box, default '#fff7ed'
 *   iconColor   string (optional) — icon color, default '#f97316'
 *   badge       string (optional) — entity name shown as a gray pill below title
 *   width       string (optional) — panel width, default '560px'
 *   footerLeft  ReactNode (optional) — replaces default Cancel button
 *   submitLabel string (optional) — action button label
 *   onSubmit    fn (optional) — action button handler; if omitted footer not shown
 *   submitDisabled boolean
 *   submitLoading  boolean
 *   children
 */
export default function RightPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconBg      = '#fff7ed',
  iconColor   = '#f97316',
  badge,
  width       = '560px',
  submitLabel = 'Save',
  onSubmit,
  submitDisabled = false,
  submitLoading  = false,
  children,
}) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else        document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position:'absolute', inset:0, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(2px)' }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type:'spring', damping:28, stiffness:280 }}
            style={{
              position: 'relative',
              width,
              maxWidth: '100vw',
              height: '100%',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
              borderRadius: '20px 0 0 20px',
            }}
          >
            {/* ── Header ── */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f0f2f5',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {icon && (
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: iconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ color: iconColor, display:'flex' }}>{icon}</span>
                  </div>
                )}
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', margin: 0, lineHeight: 1.3 }}>{title}</h2>
                  {subtitle && (
                    <p style={{ fontSize: 11, color: '#9ba8b5', margin: '2px 0 0', fontWeight: 500 }}>{subtitle}</p>
                  )}
                  {badge && (
                    <p style={{
                      display: 'inline-block', marginTop: 4,
                      fontSize: 10, fontWeight: 700, color: '#64748b',
                      background: '#f1f5f9', borderRadius: 6,
                      padding: '2px 8px', letterSpacing: '0.04em',
                    }}>{badge}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: '1px solid #e5e7eb', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#9ba8b5', flexShrink: 0,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='#f8f9fb'; e.currentTarget.style.color='#1a1a2e'; }}
                onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#9ba8b5'; }}
              >
                <X size={16}/>
              </button>
            </div>

            {/* ── Scrollable content ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {children}
            </div>

            {/* ── Footer ── */}
            {onSubmit && (
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #f0f2f5',
                display: 'flex', gap: 10,
                flexShrink: 0,
                background: '#fff',
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1, height: 42, borderRadius: 10,
                    border: '1px solid #e5e7eb', background: '#fff',
                    fontSize: 13, fontWeight: 700, color: '#64748b',
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8f9fb'}
                  onMouseLeave={e => e.currentTarget.style.background='#fff'}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitDisabled || submitLoading}
                  style={{
                    flex: 2, height: 42, borderRadius: 10,
                    background: submitDisabled || submitLoading ? '#fdba74' : '#f97316',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    border: 'none', cursor: submitDisabled || submitLoading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.15s',
                  }}
                >
                  {submitLoading ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ animation:'spin 0.7s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                  ) : null}
                  {submitLoading ? 'Saving…' : submitLabel}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AnimatePresence>
  );
}

// ── Reusable field components ─────────────────────────────────────────────────

/** 2-column grid wrapper */
export function PanelGrid({ children, cols = 2 }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:14 }}>
      {children}
    </div>
  );
}

/** Single form field: label + input/select/textarea */
export function PanelField({ label, required, children, fullWidth, style }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, gridColumn: fullWidth ? '1 / -1' : undefined, ...style }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform:'uppercase', letterSpacing:'0.06em' }}>
        {label}{required && <span style={{ color:'#f97316', marginLeft:2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_STYLE = {
  width: '100%', height: 40, padding: '0 12px',
  border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 13, color: '#1a1a2e', background: '#fff',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

/** Text / number / date input */
export function PanelInput({ icon: Icon, style, ...props }) {
  if (Icon) {
    return (
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ba8b5', display:'flex' }}>
          <Icon size={14}/>
        </span>
        <input
          style={{ ...INPUT_STYLE, paddingLeft: 32, ...style }}
          onFocus={e => e.target.style.borderColor='#f97316'}
          onBlur={e => e.target.style.borderColor='#e5e7eb'}
          {...props}
        />
      </div>
    );
  }
  return (
    <input
      style={{ ...INPUT_STYLE, ...style }}
      onFocus={e => e.target.style.borderColor='#f97316'}
      onBlur={e => e.target.style.borderColor='#e5e7eb'}
      {...props}
    />
  );
}

/** Select dropdown */
export function PanelSelect({ options = [], style, children, ...props }) {
  return (
    <div style={{ position:'relative' }}>
      <select
        style={{ ...INPUT_STYLE, paddingRight:28, appearance:'none', cursor:'pointer', ...style }}
        onFocus={e => e.target.style.borderColor='#f97316'}
        onBlur={e => e.target.style.borderColor='#e5e7eb'}
        {...props}
      >
        {children || options.map(o => (
          <option key={typeof o==='object'?o.value:o} value={typeof o==='object'?o.value:o}>
            {typeof o==='object'?o.label:o}
          </option>
        ))}
      </select>
      <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#9ba8b5' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </span>
    </div>
  );
}

/** Textarea */
export function PanelTextarea({ style, ...props }) {
  return (
    <textarea
      style={{ ...INPUT_STYLE, height:'auto', minHeight:72, padding:'10px 12px', resize:'vertical', ...style }}
      onFocus={e => e.target.style.borderColor='#f97316'}
      onBlur={e => e.target.style.borderColor='#e5e7eb'}
      {...props}
    />
  );
}

/** Divider with optional label */
export function PanelDivider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'4px 0' }}>
      <div style={{ flex:1, height:1, background:'#f0f2f5' }}/>
      {label && <span style={{ fontSize:9, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>{label}</span>}
      {label && <div style={{ flex:1, height:1, background:'#f0f2f5' }}/>}
    </div>
  );
}

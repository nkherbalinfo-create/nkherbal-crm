// App entry — design canvas with all 4 directions + full Soft screens

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);
  const dark = tweaks.dark;

  const screens = [
    { id: 'dashboard',  label: 'Dashboard'  },
    { id: 'orders',     label: 'Orders'     },
    { id: 'leads',      label: 'Leads'      },
    { id: 'customers',  label: 'Customers'  },
    { id: 'followups',  label: 'Follow-ups' },
    { id: 'whatsapp',   label: 'WhatsApp'   },
    { id: 'reports',    label: 'Reports'    },
    { id: 'settings',   label: 'Settings'   },
  ];

  return (
    <React.Fragment>
      <DesignCanvas>
        <DCSection id="soft-full" title="✓ Selected — Soft direction, all 7 screens" subtitle="Each artboard is a different screen. Click any to expand fullscreen.">
          {screens.map(s => (
            <DCArtboard key={s.id} id={`soft-${s.id}`} label={`Soft · ${s.label}`} width={1440} height={1000}>
              <SoftFull dark={dark} screen={s.id} />
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="directions" title="Other directions explored" subtitle="For reference — Variants 1, 2, 4 (not selected)">
          <DCArtboard id="editorial" label="01 · Editorial" width={1440} height={1000}>
            <VariantEditorial dark={dark} />
          </DCArtboard>
          <DCArtboard id="linear" label="02 · Linear/Stripe" width={1440} height={1000}>
            <VariantLinear dark={dark} />
          </DCArtboard>
          <DCArtboard id="mono" label="04 · Mono brutalist" width={1440} height={1000}>
            <VariantMono dark={dark} />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakToggle label="Dark mode" value={tweaks.dark} onChange={(v) => setTweak('dark', v)} />
        </TweakSection>
        <TweakSection title="About">
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,.6)', lineHeight: 1.5 }}>
            Click expand on any artboard to focus fullscreen. Use ←/→/Esc when focused.
          </div>
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

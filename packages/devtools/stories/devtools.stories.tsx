import type { Meta, StoryObj } from '@storybook/react-vite';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { type DemoOptions, DemoSession } from './demo-session';

// Queue lifetime transitions outside React's commit phase: devtools owns a separate root.
let lifecycle = Promise.resolve();
const Workbench = observer((options: DemoOptions) => {
  const [session, setSession] = useState<DemoSession>();
  useEffect(() => {
    let cancelled = false;
    let current: DemoSession | undefined;
    lifecycle = lifecycle.then(() => {
      if (cancelled) return;
      current = new DemoSession(options);
      setSession(current);
    });
    return () => {
      cancelled = true;
      lifecycle = lifecycle.then(() => current?.destroy());
    };
  }, [
    options.count,
    options.childrenPerRoot,
    options.expanded,
    options.live,
    options.theme,
  ]);
  return (
    <main
      style={{
        minHeight: '100vh',
        boxSizing: 'border-box',
        padding: 32,
        background: options.theme === 'dark' ? '#151a25' : '#eef1f7',
        color: options.theme === 'dark' ? '#e5e8ef' : '#182030',
        fontFamily: 'system-ui',
      }}
    >
      <h1 style={{ maxWidth: 620 }}>ViewModel Devtools playground</h1>
      <p style={{ maxWidth: 620 }}>
        Real ViewModelStore with observable project models, nested objects, Map,
        Set and computed values.
      </p>
      {session ? (
        <>
          <p aria-live="polite">
            {session.vmCount.toLocaleString('en-US')} ViewModels · Open:{' '}
            {session.openMs} ms · Cached properties: {session.propertyModels}
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              maxWidth: 620,
            }}
          >
            <button onClick={session.open}>Open devtools</button>
            <button onClick={session.update}>Update values</button>
            <button onClick={session.add}>Add ViewModel</button>
            <button onClick={session.remove}>Remove ViewModel</button>
            <button onClick={session.findLast}>Find last ViewModel</button>
            <button
              onClick={() => {
                session.devtools.inspector.expandAll();
                session.refreshMetrics();
              }}
            >
              Expand all
            </button>
            <button onClick={() => session.devtools.inspector.collapseAll()}>
              Collapse all
            </button>
            <button onClick={session.refreshMetrics}>Refresh metrics</button>
          </div>
          <p style={{ maxWidth: 620 }}>
            Opening includes two animation frames. Cached properties grow as you
            inspect new rows. Change Controls to recreate the session.
          </p>
        </>
      ) : (
        <p>Creating store…</p>
      )}
    </main>
  );
});
const meta = {
  title: 'Devtools/Connected store',
  component: Workbench,
  args: {
    count: 100,
    childrenPerRoot: 9,
    expanded: false,
    live: false,
    theme: 'dark',
  },
  argTypes: {
    count: { control: { type: 'number', min: 1, max: 50000, step: 100 } },
    childrenPerRoot: { control: { type: 'number', min: 0, max: 100 } },
    theme: { control: 'radio', options: ['dark', 'light'] },
  },
} satisfies Meta<typeof Workbench>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Thousand: Story = { args: { count: 1000 } };
export const TenThousand: Story = { args: { count: 10000 } };
export const TenThousandFlat: Story = {
  args: { count: 10000, childrenPerRoot: 0 },
};
export const FullyExpanded: Story = { args: { count: 10000, expanded: true } };
export const LiveUpdates: Story = { args: { count: 1000, live: true } };
export const LightBackground: Story = { args: { count: 1000, theme: 'light' } };

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { RootStore } from '@/stores/root-store';
import { RootStoreProvider } from '@/stores/root-store/components/provider';

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/', query: {}, asPath: '/' }),
}));

import HomePage from '../pages/index';

describe('Main page', () => {
  it('should match snapshot', () => {
    const rootStore = new RootStore({
      appInfo: { appName: 'Test App' },
    });

    const { container } = render(
      <RootStoreProvider store={rootStore}>
        <HomePage
          initialPayload={{
            headline: 'Test headline',
            serverRenderedAt: '2024-01-01T00:00:00.000Z',
            bumpable: true,
          }}
          rootStoreSnapshot={{}}
        />
      </RootStoreProvider>,
    );

    expect(container.innerHTML).toMatchSnapshot();
  });
});

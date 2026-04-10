import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { App } from '../app';
import { RootStore } from '../stores/root-store';
import { RootStoreProvider } from '../stores/root-store/components/provider';

describe('Main page', () => {
  it('should match snapshot', () => {
    const rootStore = new RootStore({
      appInfo: { appName: 'Test App' },
    });

    const { container } = render(
      <RootStoreProvider store={rootStore}>
        <App />
      </RootStoreProvider>,
    );

    expect(container.innerHTML).toMatchSnapshot();
  });
});

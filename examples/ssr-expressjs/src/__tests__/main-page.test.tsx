import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { App } from '../app';
import type { AppRouteData } from '../routes';

describe('Main page', () => {
  it('should match snapshot', () => {
    const route: AppRouteData = {
      pathname: '/',
      pageTitle: 'Test',
      data: {
        initialPayload: {
          headline: 'Test headline',
          serverRenderedAt: '2024-01-01T00:00:00.000Z',
          bumpable: true,
        },
        rootStoreSnapshot: {
          appInfo: { appName: 'Test App' },
        },
      },
    };

    const { container } = render(<App route={route} />);

    expect(container.innerHTML).toMatchSnapshot();
  });
});

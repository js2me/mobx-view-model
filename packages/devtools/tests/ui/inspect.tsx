import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { observer } from 'mobx-react-lite';
import { afterEach, expect } from 'vitest';
import { DevtoolsInspector } from '@/model/devtools-inspector';
import { DevtoolsSettings } from '@/model/devtools-settings';
import { PropertyListItem } from '@/model/list-item/property-list-item';
import type { VMListItem } from '@/model/list-item/vm-list-item';
import type { AnyVM } from '@/model/types';
import { PropertyListItemRender } from '@/ui/devtools-content/list-items/property-list-item-render';
import './setup';
const resources: Array<() => void> = [];
afterEach(() => {
  for (const dispose of resources.splice(0).reverse()) dispose();
  localStorage.clear();
  sessionStorage.clear();
});

// Real inspector, rows, editors and an independent application observer.
export function inspect<T extends object>(
  model: T,
  path: string[],
  read: () => unknown,
  options: {
    additionalPaths?: string[][];
    siblings?: boolean;
  } = {},
) {
  const notifications: { title: string }[] = [];
  const settings = new DevtoolsSettings({
    display: {
      showInternals: true,
      groupViewModelBaseMembers: false,
      highlightUpdates: false,
    },
  });
  const inspector = new DevtoolsInspector(settings, {
    push: (notification) => {
      notifications.push(notification);
    },
  });
  const root = inspector.getVmItem(model as AnyVM);
  resources.push(
    () => settings.destroy(),
    () => inspector.destroy(),
  );
  function findItem(path: string[]) {
    let parent: VMListItem | PropertyListItem = root;
    for (const key of path) {
      const child = parent.children.find(
        (child) => child instanceof PropertyListItem && child.property === key,
      );
      expect(
        child,
        `Property ${key} must be discoverable in the devtools tree`,
      ).toBeInstanceOf(PropertyListItem);
      parent = child as PropertyListItem;
    }
    return parent as PropertyListItem;
  }
  const App = observer(() => (
    <output data-testid="app">{JSON.stringify(read())}</output>
  ));
  render(<App />);
  const item = findItem(path);
  const Siblings = observer(() => (
    <section data-testid="siblings">
      {item.parentListItem.children.map((child) =>
        child instanceof PropertyListItem ? (
          <div key={child.key} data-row-id={child.key}>
            <PropertyListItemRender item={child} />
          </div>
        ) : null,
      )}
    </section>
  ));
  render(
    <>
      <section data-testid="row">
        <PropertyListItemRender item={item} />
      </section>
      {options.siblings ? <Siblings /> : null}
      {options.additionalPaths?.map((path) => (
        <section key={JSON.stringify(path)} data-testid={JSON.stringify(path)}>
          <PropertyListItemRender item={findItem(path)} />
        </section>
      ))}
    </>,
  );
  const row = within(screen.getByTestId('row'));
  const user = userEvent.setup();
  return {
    user,
    row,
    notifications,
    rowFor: (path: string[]) =>
      within(screen.getByTestId(JSON.stringify(path))),
    async edit(
      content: string,
      submit: 'Enter' | 'Apply' = 'Enter',
      target = row,
    ) {
      await user.click(target.getByTitle('Edit'));
      const input = target.getByRole('textbox');
      await user.clear(input);
      await user.paste(content);
      if (submit === 'Enter') await user.keyboard('{Enter}');
      else await user.click(target.getByTitle('Apply'));
    },
    expectApp(value: unknown) {
      expect(screen.getByTestId('app').textContent).toBe(JSON.stringify(value));
    },
  };
}

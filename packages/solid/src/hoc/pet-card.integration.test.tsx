import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { observable } from 'mobx';
import { describe, expect, it } from 'vitest';
import { enableObservableTracking, withViewModel } from '../index.js';
import { ViewModelsProvider } from '../components/index.js';
import { ViewModelBaseMock, ViewModelStoreBaseMock } from '../lib/test-mocks.js';

enableObservableTracking();

class PetCardVM extends ViewModelBaseMock {
  private state = observable({ petName: 'Mochi' });

  get petName() {
    return this.state.petName;
  }

  setPetName(petName: string) {
    this.state.petName = petName;
  }
}

const PetCard = withViewModel(PetCardVM, ({ model }) => (
  <div>
    <span>{`Pet name: ${model.petName}`}</span>
    <input
      placeholder="name"
      value={model.petName}
      onInput={(event) => model.setPetName(event.currentTarget.value)}
    />
  </div>
));

describe('SolidJS integration', () => {
  it('tracks observable ViewModel state and updates it from input', async () => {
    const store = new ViewModelStoreBaseMock();

    render(() => (
      <ViewModelsProvider value={store}>
        <PetCard />
      </ViewModelsProvider>
    ));

    const input = screen.getByPlaceholderText('name') as HTMLInputElement;
    expect(screen.getByText('Pet name: Mochi')).toBeDefined();
    expect(input.value).toBe('Mochi');

    fireEvent.input(input, { target: { value: 'Nori' } });

    await waitFor(() => {
      expect(screen.getByText('Pet name: Nori')).toBeDefined();
      expect(input.value).toBe('Nori');
      expect(store.get(PetCardVM)?.petName).toBe('Nori');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { detectObserverCalls } from '../detect-observer.js';

describe('detectObserverCalls', () => {
  it('detects const X = observer(() => {})', () => {
    const code = `
import { observer } from 'mobx-react-lite';

const Header = observer(() => {
  return <div>Hello</div>;
});
`;
    const result = detectObserverCalls(code);
    expect(result).toHaveLength(1);
    expect(result[0].varName).toBe('Header');
    expect(result[0].isExported).toBe(false);
  });

  it('detects export const X = observer(() => {})', () => {
    const code = `
import { observer } from 'mobx-react-lite';

export const CounterBody = observer(() => {
  return <div>{model.clicks}</div>;
});
`;
    const result = detectObserverCalls(code);
    expect(result).toHaveLength(1);
    expect(result[0].varName).toBe('CounterBody');
    expect(result[0].isExported).toBe(true);
  });

  it('detects const X = observer(NamedComponent)', () => {
    const code = `
import { observer } from 'mobx-react-lite';

function RawHeader() { return <div />; }
const Header = observer(RawHeader);
`;
    const result = detectObserverCalls(code);
    expect(result).toHaveLength(1);
    expect(result[0].varName).toBe('Header');
  });

  it('detects const X = observer(function Name() {})', () => {
    const code = `
import { observer } from 'mobx-react-lite';

const Header = observer(function Header() {
  return <div />;
});
`;
    const result = detectObserverCalls(code);
    expect(result).toHaveLength(1);
    expect(result[0].varName).toBe('Header');
  });

  it('detects multiple observer calls', () => {
    const code = `
import { observer } from 'mobx-react-lite';

const Header = observer(() => <div />);
const Footer = observer(() => <div />);
`;
    const result = detectObserverCalls(code);
    expect(result).toHaveLength(2);
    expect(result[0].varName).toBe('Header');
    expect(result[1].varName).toBe('Footer');
  });

  it('returns empty for files without mobx-react-lite import', () => {
    const code = `
const Header = observer(() => <div />);
`;
    const result = detectObserverCalls(code);
    expect(result).toHaveLength(0);
  });

  it('handles observer with nested parentheses', () => {
    const code = `
import { observer } from 'mobx-react-lite';

const App = observer(() => {
  const handleClick = () => {};
  return <div onClick={handleClick} />;
});
`;
    const result = detectObserverCalls(code);
    expect(result).toHaveLength(1);
    expect(result[0].varName).toBe('App');
  });
});

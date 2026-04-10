import React from 'react';
import { AppNav } from './components/app-nav/index.js';
import { Counter } from './components/counter/index.js';

export function App() {
  return (
    <>
      <AppNav />
      <main className="container">
        <h1>CSR + React {React.version}</h1>
        <p>
          This example mounts entirely on the client via{' '}
          <code>ReactDOM.createRoot()</code>.
        </p>
        <Counter
          payload={{
            headline: 'Counter state is stored in a MobX ViewModel',
          }}
        />
      </main>
    </>
  );
}

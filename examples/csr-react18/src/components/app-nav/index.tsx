import { withViewModel } from 'mobx-view-model-react';
import { AppNavVM } from './model.js';

export const AppNav = withViewModel(AppNavVM, ({ model }) => {
  return (
    <header className="nav">
      <div className="nav-inner">
        <strong>{model.title}</strong>
        {model.chips.map((chip) => (
          <span key={chip} className="chip">
            {chip}
          </span>
        ))}
      </div>
    </header>
  );
});

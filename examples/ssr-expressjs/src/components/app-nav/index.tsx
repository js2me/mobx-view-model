import { withViewModel } from 'mobx-view-model';
import { AppNavVM } from './model.js';

export const AppNav = withViewModel<AppNavVM, { pathname: string }>(
  AppNavVM,
  ({ pathname, model }) => {
    return (
      <nav
        className="flex flex-row items-center border-demo-border border-b bg-demo-card/80 backdrop-blur-sm"
        aria-label="Main"
      >
        <h1 className="w-0 whitespace-pre">{model.title}</h1>
        <div className="mx-auto flex max-w-[40rem] flex-wrap gap-2 px-5 py-3">
          {model.links.map(({ href, label }) => {
            const active =
              href === '/'
                ? pathname === '/'
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <a
                key={href}
                href={href}
                className={
                  active
                    ? 'rounded-full bg-demo-accent px-3 py-1.5 font-semibold text-sm text-white'
                    : 'rounded-full px-3 py-1.5 font-medium text-demo-muted text-sm transition-colors hover:bg-demo-border/40 hover:text-demo-fg'
                }
              >
                {label}
              </a>
            );
          })}
        </div>
      </nav>
    );
  },
);

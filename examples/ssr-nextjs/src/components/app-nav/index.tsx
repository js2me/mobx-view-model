'use client';

import { withViewModel } from 'mobx-view-model-react';
import Link from 'next/link';
import { AppNavVM } from './model';

export const AppNav = withViewModel<AppNavVM, { pathname: string }>(AppNavVM, ({ pathname,model }) => {
  return (
    <nav
      className="border-b border-demo-border bg-demo-card/80 backdrop-blur-sm flex flex-row items-center"
      aria-label="Main"
    >
      <h1 className='w-0 whitespace-pre'>{model.title}</h1>
      <div className="mx-auto flex max-w-[40rem] flex-wrap gap-2 px-5 py-3">
        {model.links.map(({ href, label }) => {
          const active =
            href === '/'
              ? pathname === '/'
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={
                active
                  ? 'rounded-full bg-demo-accent px-3 py-1.5 text-sm font-semibold text-white'
                  : 'rounded-full px-3 py-1.5 text-sm font-medium text-demo-muted transition-colors hover:bg-demo-border/40 hover:text-demo-fg'
              }
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
})

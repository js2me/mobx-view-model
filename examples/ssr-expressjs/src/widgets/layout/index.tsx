import { type ViewModelProps, withViewModel } from 'mobx-view-model';
import type { ReactNode } from 'react';
import { Header } from './components/header';
import { LayoutVM } from './model';

export interface LayoutProps extends ViewModelProps<LayoutVM> {
  children: ReactNode;
}

export const Layout = withViewModel(
  LayoutVM,
  ({ children, model }: LayoutProps) => {
    return (
      <div className="flex min-h-screen w-full flex-col items-center bg-base-bg">
        <Header />
        <div className="flex w-full max-w-[1416px] flex-1 flex-col">
          {children}
        </div>
      </div>
    );
  },
);

'use client';

import '@/bootstrap/client';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { AppNav } from '@/components/app-nav';
import type { RootStoreSnapshot } from '@/stores/root-store';
import { withRootStore } from '@/stores/root-store/components/with-root-store';

type PagePropsWithRoot = AppProps['pageProps'] & {
  rootStoreSnapshot?: RootStoreSnapshot;
};

export default withRootStore(function PagesApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { rootStoreSnapshot, ...restPageProps } = pageProps as PagePropsWithRoot;

  return (
    <>
      <AppNav pathname={router.pathname} />
      <Component {...restPageProps} />
    </>
  );
})

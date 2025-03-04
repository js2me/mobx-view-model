import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description={`${siteConfig.tagline}`}>
      <header className={'hero hero--primary flex-1 !bg-[transparent] !text-black dark:!text-ifm-secondary'}>
        <div className="container">
          <Heading as="h1" className="hero__title">
            {siteConfig.title}
          </Heading>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={'flex'}>
            <Link
              className="button button--primary button--lg"
              to="/getting-started">
              Getting Started
            </Link>
          </div>
        </div>
      </header>
    </Layout>
  );
}

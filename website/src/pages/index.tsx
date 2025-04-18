import type { CSSProperties, ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Logo from '@theme/Logo';
import CodeBlock from '@theme/CodeBlock';
import exampleCodeBlock from "./example";

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description={`${siteConfig.tagline}`}
      noFooter
    >
      <header className={'hero hero--primary flex-1 !bg-[transparent] !text-black dark:!text-ifm-secondary'}>
        <div className="container relative">
          <CodeBlock language='ts' className='code-block-no-bg absolute right-4 top-1/2 -translate-y-1/2 max-sm:hidden !shadow-none'>{exampleCodeBlock.trim()}</CodeBlock>
          <div className='flex flex-row flex-wrap items-start relative'>
            <Logo imageClassName='w-28 mt-1 z-2 relative' titleClassName='hidden'/> 
            <div className='flex flex-col gap-0 p-7 justify-center -mt-7 flex-wrap bg-ifm-background rounded-xl'>
              <Heading as="h1" className="hero__title">
                {siteConfig.title}
              </Heading>
              <p className="hero__subtitle">{siteConfig.tagline}</p>
              <div className={'flex flex-row gap-2 mr-auto'}>
                <Link
                  className="button button--primary button--lg"
                  to="/getting-started">
                  Getting Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>
    </Layout>
  );
}

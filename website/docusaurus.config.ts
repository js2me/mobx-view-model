import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import * as packageJson from "../package.json" assert { type: "json" };

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  staticDirectories: ['../assets', '../docs'],
  title: packageJson.name,
  tagline: packageJson.description,
  favicon: 'logo.png',

  // Set the production url of your site here
  url: `https://${packageJson.author}.github.io`,
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: `/${packageJson.name}/`,
  deploymentBranch: 'gh-pages',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: `${packageJson.author}.github.io`, // Usually your GitHub org/user name.
  projectName: packageJson.name, // Usually your repo name.
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru']
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          path: '../docs',
          routeBasePath: '/', // Добавьте эту строку
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: ({ docPath, locale, permalink, version, versionDocsDirPath}) =>  {
            return `https://github.com/${packageJson.author}/${packageJson.name}/tree/master/docs/${docPath}`
          },
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: packageJson.name,
      logo: {
        alt: '',
        src: 'logo.png',
      },
      items: [
        {
          label: 'Getting Started',
          to: 'getting-started',
          activeBasePath: 'getting-started',
        },
        {
          label: 'API',
          to: 'api/view-models/overview',
          activeBasePath: 'api/view-models/overview',
        },
        {
          label: 'React',
          to: 'react/integration',
          activeBasePath: 'react/integration',
        },
        {
          href: packageJson.repository.url.replace('git://', 'https://'),
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [],
      copyright: `Copyright © ${new Date().getFullYear()} Sergey Volkov. Built with Docusaurus`,
    },
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    prism: {
      theme: prismThemes.okaidia,
      darkTheme: prismThemes.oceanicNext,
    },
  } satisfies Preset.ThemeConfig,
  plugins: [
    ['./src/plugins/tailwind-config.js', {}],
  ]
};

export default config;

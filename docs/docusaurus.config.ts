import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const config: Config = {
  title: 'Nutty Panel',
  tagline: 'Ultimate self-hosted Minecraft server panel — simple for beginners, powerful for experts.',
  favicon: 'img/favicon.ico',

  url: 'https://docs.nutty-panel.com',
  baseUrl: '/',
  organizationName: 'Cacahouetes',
  projectName: 'nutty-panel',
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'throw',
  onDuplicateRoutes: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks(brokenMarkdownLink) {
        throw new Error(`Broken markdown link: ${brokenMarkdownLink.sourceFilePath}`)
      },
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr'],
    localeConfigs: {
      en: { label: 'English' },
      fr: { label: 'Français' },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: { defaultMode: 'light', disableSwitch: false, respectPrefersColorScheme: true },
    navbar: {
      title: 'Nutty Panel',
      logo: { alt: 'Nutty Panel', src: 'img/logo.svg' },
      items: [
        { to: '/docs/intro', position: 'left', label: 'Docs' },
        {
          href: 'https://github.com/Cacahouetes/nutty-panel',
          position: 'right',
          label: 'GitHub',
        },
        { type: 'localeDropdown', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/docs/intro' },
            { label: 'Installation', to: '/docs/installation/quickstart' },
            { label: 'FAQ', to: '/docs/faq' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/Cacahouetes/nutty-panel' },
            { label: 'Issues', href: 'https://github.com/Cacahouetes/nutty-panel/issues' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Nutty Panel. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
}

export default config
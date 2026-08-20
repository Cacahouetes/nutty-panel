import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import type { JSX } from 'react'
import styles from './index.module.css'

const COPY: Record<string, { tagline: string; cta: string; featuresTitle: string; features: { title: string; body: string }[] }> = {
  en: {
    tagline: 'Ultimate self-hosted Minecraft server panel — simple for beginners, powerful for experts.',
    cta: 'Read the docs',
    featuresTitle: 'Everything your Minecraft servers need',
    features: [
      { title: 'One-command install', body: 'Spin up the panel on any Linux VPS with a single script — Docker, secrets and HTTPS handled for you.' },
      { title: 'All server types', body: 'Vanilla, Paper, Fabric, Forge and Bedrock instances with full lifecycle control, consoles and files.' },
      { title: 'Backups & integrations', body: 'Automatic backups, Playit.gg tunnels, CurseForge and Modrinth modpacks, webhooks and a Smart Proxy for one-port access.' },
    ],
  },
  fr: {
    tagline: 'Panel Minecraft auto-hébergé ultime — simple pour les débutants, puissant pour les experts.',
    cta: 'Lire la documentation',
    featuresTitle: 'Tout ce dont vos serveurs Minecraft ont besoin',
    features: [
      { title: 'Installation en une commande', body: 'Démarrez le panel sur n\u2019importe quel VPS Linux avec un seul script — Docker, secrets et HTTPS gérés pour vous.' },
      { title: 'Tous les types de serveurs', body: 'Instances Vanilla, Paper, Fabric, Forge et Bedrock avec contrôle complet du cycle de vie, console et fichiers.' },
      { title: 'Backups & intégrations', body: 'Backups automatiques, tunnels Playit.gg, modpacks CurseForge et Modrinth, webhooks et un Smart Proxy pour un accès sur un seul port.' },
    ],
  },
}

export default function Home(): JSX.Element {
  const { siteConfig, i18n } = useDocusaurusContext()
  const copy = COPY[i18n.currentLocale] ?? COPY.en

  return (
    <Layout title="Home" description={copy.tagline}>
      <header className={styles.hero}>
        <div className="container">
          <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
          <p className={styles.heroTagline}>{copy.tagline}</p>
          <div className={styles.heroButtons}>
            <Link className="button button--primary button--lg" to="/docs/intro">
              {copy.cta}
            </Link>
          </div>
        </div>
      </header>
      <main>
        <section className={styles.featuresSection}>
          <div className="container">
            <h2 className={styles.featuresTitle}>{copy.featuresTitle}</h2>
            <div className={styles.featuresGrid}>
              {copy.features.map((feature) => (
                <div key={feature.title} className={styles.featureCard}>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  )
}
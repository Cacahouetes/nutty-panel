---
sidebar_position: 1
---

# Prérequis

Nutty Panel est conçu pour tourner sur du matériel modeste — un VPS de 2 Go suffit
pour quelques serveurs.

## Matériel

- **RAM** : 2 Go minimum (plus pour les modpacks Forge/Fabric)
- **CPU** : 1–2 cœurs
- **Disque** : 10 Go libres (grandit avec les mondes et les backups)
- **OS** : Ubuntu 22.04 LTS, Debian 12 ou CentOS/RHEL (tout Linux avec `apt` ou `dnf`)

## Logiciels

Le script d'installation en une commande s'occupe de tout :

- **Docker** + plugin Docker Compose
- **curl** (pour récupérer le script)
- **git** (uniquement pour l'installation manuelle)

## Réseau

- Un **port TCP ouvert** pour le panel (défaut : port `80`, ou `443` si vous fournissez
  un domaine pour le HTTPS)
- Pour permettre aux joueurs de se connecter sur le port Minecraft par défaut,
  ouvrez **TCP 25565** (Smart Proxy)
- Optionnel : un **domaine** pointant vers votre serveur pour du HTTPS automatique
  via Caddy (Let's Encrypt)

## Clés API optionnelles

| Intégration | Clé                 | Où                     |
|-------------|---------------------|------------------------|
| CurseForge  | `CURSEFORGE_API_KEY` | Tableau de bord API [curseforge.com](https://www.curseforge.com) |
| Playit.gg   | `PLAYIT_API_KEY`     | Compte [playit.gg](https://playit.gg) |

Elles peuvent être ajoutées plus tard dans `.env` — rien ne bloque l'installation sans elles.
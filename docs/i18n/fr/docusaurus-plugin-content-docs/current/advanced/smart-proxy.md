---
sidebar_position: 2
---

# Smart Proxy

Le Smart Proxy expose **tous vos serveurs via un seul port public** (défaut `25565`).
Les joueurs se connectent à un hostname et le proxy les route automatiquement vers
le bon serveur — plus besoin de mémoriser les ports par serveur.

## Fonctionnement

1. Un client Minecraft envoie son **handshake** (le hostname auquel il se connecte).
2. Le proxy parse le handshake et résout le serveur cible :
   `hostname → port demandé → serveur par défaut → connexion refusée`.
3. Le proxy ouvre une connexion vers le port interne du serveur cible et tunnelise
   le trafic client (y compris le handshake original).

## Adresses

Chaque serveur reçoit un hostname construit depuis son nom slugifié :

```
<nom-du-serveur>.<PROXY_DOMAIN>
```

| Nom du serveur | PROXY_DOMAIN       | Adresse                            |
|----------------|--------------------|------------------------------------|
| `Lobby`        | `play.example.com` | `lobby.play.example.com:25565`     |
| `Survival Deux`| `play.example.com` | `survival-deux.play.example.com:25565` |

Pour l'utiliser, pointez un enregistrement DNS wildcard vers votre panel :

```
*.play.example.com  →  A  <ip-du-panel>
```

## Configuration

| Variable                  | Défaut        | Description                                    |
|---------------------------|---------------|------------------------------------------------|
| `PROXY_PUBLIC_PORT`       | `25565`       | Port Minecraft public unique                   |
| `PROXY_DOMAIN`            | `play.local`  | Suffixe d'hostname (un domaine que vous contrôlez) |
| `PROXY_DEFAULT_SERVER_ID` | *(vide)*      | Serveur recevant les connexions à hostname inconnu (la connexion classique sur le port `25565`) |
| `PROXY_HOST`              | `0.0.0.0`     | Adresse d'écoute                              |

Les changements prennent effet après redémarrage du panel (`docker compose restart server`).

## Tableau de bord

La section **Proxy** du tableau de bord affiche :

- l'état d'écoute et le port public
- la route de chaque serveur (hostnames, cible, serveur par défaut ou non)
- le statut **en ligne / hors ligne** de chaque route

## Détails de comportement

- Une connexion avec un **hostname sans correspondance** et **sans serveur par défaut**
  est refusée.
- Les **serveurs arrêtés** apparaissent hors ligne ; la connexion est tout de même
  routée et le serveur ne répond simplement pas (ou refuse).
- Le proxy supporte les **handshakes fragmentés** (octets répartis sur plusieurs paquets TCP).
- La première connexion déclenche la résolution de route ; ensuite le trafic est
  relayé dans les deux sens.

## Dépannage

| Symptôme                     | Correctif                                      |
|------------------------------|------------------------------------------------|
| `Impossible de se connecter` | Vérifiez le DNS wildcard `PROXY_DOMAIN` + `PROXY_PUBLIC_PORT` ouvert dans le pare-feu |
| Serveur absent de la liste   | Les routes sont reconstruites au démarrage ; utilisez **Actualiser** dans le tableau de bord |
| Les connexions à hostname inconnu échouent | Définissez `PROXY_DEFAULT_SERVER_ID` sur un serveur |
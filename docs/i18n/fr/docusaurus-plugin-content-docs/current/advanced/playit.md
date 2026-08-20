---
sidebar_position: 3
---

# Tunnels Playit.gg

[Playit.gg](https://playit.gg) fournit des tunnels gratuits qui exposent vos serveurs
Minecraft sur internet **sans ouvrir aucun port** — idéal quand le panel tourne
derrière NAT, CGNAT ou un pare-feu que vous ne contrôlez pas.

## Fonctionnement

- Un petit **agent** tourne à côté du panel et maintient un tunnel vers le réseau Playit.
- Chaque serveur reçoit une adresse publique comme `12345.playit.gg:25565`.
- Les joueurs se connectent à cette adresse ; Playit transfère le trafic vers l'agent,
  qui le transmet au conteneur du serveur.

## Prérequis

1. Un compte Playit.gg.
2. Configurez `.env` :

| Variable              | Description                            |
|-----------------------|----------------------------------------|
| `PLAYIT_API_KEY`      | Clé API Playit.gg                      |
| `PLAYIT_AGENT_BIN`    | Chemin du binaire de l'agent Playit    |
| `PLAYIT_AGENT_SECRET` | Secret d'authentification de l'agent   |
| `PLAYIT_API_BASE`     | URL de base de l'API (défaut `https://api.playit.gg`) |

3. Redémarrez le panel.

## Créer un tunnel

Depuis le tableau de bord, ouvrez l'onglet **Tunnels** du serveur et cliquez sur
**Créer un tunnel**. Le panel :

1. enregistre le tunnel auprès de l'API Playit,
2. démarre l'agent si nécessaire,
3. affiche l'adresse publique `host:port` à partager avec les joueurs.

L'adresse du tunnel apparaît aussi sur la carte du serveur.

## Gérer les tunnels

- **Lister** — tous les tunnels configurés avec leurs adresses publiques
- **Supprimer** — supprime le tunnel (les joueurs perdent l'accès immédiatement)
- **Statut** — état de l'agent (`running`, `stopped`, `error`, `disabled`) et nombre de tunnels

## Utilisation avec le Smart Proxy

Tunnels et Smart Proxy sont indépendants : le proxy sert aux joueurs qui joignent
l'IP de votre panel sur le port 25565 ; les tunnels servent aux joueurs qui passent
par Playit. Vous pouvez utiliser les deux en même temps.

## Dépannage

| Symptôme                      | Correctif                                 |
|-------------------------------|-------------------------------------------|
| Agent `error` / `disabled`    | Vérifiez que `PLAYIT_AGENT_BIN` existe et que `PLAYIT_AGENT_SECRET` est défini |
| Tunnel 404 sur l'API Playit   | Vérifiez `PLAYIT_API_KEY`                 |
| Les joueurs ne peuvent pas se connecter | Vérifiez que le serveur tourne et que l'adresse utilisée est celle du tableau de bord |
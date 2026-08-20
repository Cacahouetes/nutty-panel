---
sidebar_position: 5
---

# Cycle de vie automatique

Les serveurs peuvent démarrer et s'arrêter seuls selon l'activité des joueurs, pour
que les mondes inactifs ne consomment pas de ressources.

## Auto-start

Quand il est activé pour un serveur, une **sonde de connexion** surveille le port
du serveur :

- un joueur tentant de se connecter à un serveur **arrêté** déclenche un démarrage automatique,
- la connexion est mise en attente jusqu'à ce que le serveur soit prêt, puis transmise.

Utile avec le Smart Proxy : les joueurs qui rejoignent `lobby.play.example.com:25565`
réveillent le serveur Lobby automatiquement.

## Auto-stop

Quand il est activé, le serveur s'arrête seul après un **délai d'inactivité**
configurable — aucun joueur en ligne pendant X minutes → arrêt propre.

## Configuration

Chaque serveur a ses propres réglages :

| Réglage      | Description                                      |
|--------------|--------------------------------------------------|
| Auto-start   | Démarrer le serveur quand une sonde de connexion le touche |
| Auto-stop    | Arrêter le serveur après inactivité              |
| Délai d'inactivité | Minutes sans joueurs avant l'auto-stop (défaut 30) |

Configurez depuis l'onglet **Paramètres** du serveur.

## Cas d'usage

- **VPS économique** — arrêtez les serveurs que personne ne joue, gardez la RAM libre
- **Serveurs événementiels** — auto-start au premier joueur
- **Jeu en groupe** — réveillez un monde partagé sans intervention manuelle
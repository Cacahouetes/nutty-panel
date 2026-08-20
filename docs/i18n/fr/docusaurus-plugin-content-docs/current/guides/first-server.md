---
sidebar_position: 1
---

# Créer son premier serveur

## 1. Créer le serveur

Depuis le tableau de bord, cliquez sur **Nouveau serveur** et renseignez :

| Champ           | Description                                       |
|-----------------|---------------------------------------------------|
| Nom             | Nom d'affichage (ex. `Survival`)                  |
| Type            | `Vanilla`, `Paper`, `Fabric`, `Forge` ou `Bedrock` |
| Version         | Version Minecraft (ex. `1.21.1`)                  |
| Mémoire (Mo)    | Limite RAM du conteneur (défaut 2048)             |
| CPU (%)         | Limite CPU du conteneur (défaut 100)              |

Le panel télécharge le jar du serveur, crée le conteneur et enregistre le serveur —
aucune configuration manuelle nécessaire.

## 2. Démarrer le serveur

Cliquez sur **Démarrer** sur la carte du serveur. L'état passe par `Démarrage` → `En ligne`.

Pendant l'exécution, le tableau de bord affiche :

- **Console** — sortie live du serveur
- **Métriques** — utilisation CPU et mémoire
- **Joueurs** — joueurs en ligne (Vanilla/Paper)

## 3. Se connecter avec le client Minecraft

Utilisez l'adresse indiquée sur la carte du serveur :

- `localhost:PORT` si vous êtes sur la même machine
- `IP_DU_SERVEUR:PORT` depuis l'extérieur (ouvrez le port dans le pare-feu)
- L'adresse **Smart Proxy** `<nom>.<votre-domaine>:25565` si activé — voir
  [Smart Proxy](../advanced/smart-proxy.md)
- Une adresse **Playit.gg** si le serveur est derrière NAT — voir
  [Playit.gg](../advanced/playit.md)

## 4. Contrôles du cycle de vie

| Action      | Description                                  |
|-------------|----------------------------------------------|
| **Démarrer** | Démarre le conteneur du serveur             |
| **Arrêter**  | Arrêt propre (commande `stop`, monde sauvegardé) |
| **Redémarrer** | Arrêt puis démarrage                      |
| **Kill**     | Arrêt forcé du conteneur (le monde peut ne pas être sauvegardé) |

## Gérer un serveur existant

Utilisez le bouton **Modifier** pour changer la mémoire, le CPU ou la version.
Supprimer un serveur retire son conteneur et ses fichiers — faites d'abord un backup
(voir [Backups](./backups.md)).
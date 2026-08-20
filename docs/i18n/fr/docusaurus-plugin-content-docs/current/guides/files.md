---
sidebar_position: 4
---

# Gestionnaire de fichiers

L'onglet **Fichiers** offre un gestionnaire de fichiers web pour chaque répertoire
de serveur : configs, plugins, mondes, journaux et tout le reste.

## Fonctionnalités

- **Parcourir** — naviguer dans l'arborescence du serveur
- **Voir & éditer** — lire et modifier les fichiers texte (ex. `server.properties`,
  `paper.yml`) avec un éditeur intégré
- **Téléverser** — envoyer des fichiers depuis votre ordinateur (ex. un jar de plugin)
- **Répertoires** — créer et supprimer des dossiers
- **Télécharger** — télécharger n'importe quel fichier

## Conseils

- Arrêtez toujours le serveur avant de remplacer des configs ou des fichiers de monde.
- `server.properties` est rechargé à chaud par la plupart des types de serveur,
  mais un redémarrage est plus sûr.
- Après l'upload d'un plugin, vérifiez le fichier dans la liste **Mods / Plugins**
  et redémarrez le serveur.

## Chemins

Chaque serveur a son propre répertoire isolé. Vous ne franchissez jamais les limites
entre serveurs — les conteneurs l'imposent aussi avec des montages séparés.
---
sidebar_position: 2
---

# Mods, plugins et modpacks

Nutty Panel s'intègre à **CurseForge** et **Modrinth** pour installer mods et modpacks
sans toucher au système de fichiers.

## Prérequis

- Une **clé API CurseForge** dans `.env` (`CURSEFORGE_API_KEY`) pour le contenu CurseForge.
- Modrinth fonctionne sans clé.

## Installer un modpack

1. Ouvrez le serveur, puis l'onglet **Mods / Modpacks**.
2. Choisissez un fournisseur (**CurseForge** ou **Modrinth**) et recherchez.
3. Sélectionnez un modpack et cliquez sur **Installer**.
4. Le panel le télécharge, le décompresse dans le répertoire du serveur et installe
   le type de serveur correspondant si nécessaire.

L'installation s'exécute en arrière-plan ; le serveur doit être **arrêté** pendant l'installation.

## Installer un mod ou plugin unique

Le même flux de recherche fonctionne pour les mods individuels (Fabric/Forge) et
les plugins (Paper) : rechercher, sélectionner, installer. Les fichiers arrivent
respectivement dans `mods/` ou `plugins/`.

## Gérer le contenu installé

L'onglet **Installés** liste le contenu installé par serveur. Vous pouvez supprimer
un élément directement depuis cette liste.

## Compatibilité

- **Paper/Spigot** — plugins (`.jar` dans `plugins/`)
- **Fabric** — mods (`.jar` dans `mods/`, avec fabric loader)
- **Forge** — mods (`.jar` dans `mods/`)
- **Vanilla/Bedrock** — modpacks non supportés ; utilisez le gestionnaire de
  [Fichiers](./files.md) pour du contenu manuel

:::note
Le type et la version du serveur doivent correspondre au modpack, sinon le serveur
risque de refuser de démarrer.
:::
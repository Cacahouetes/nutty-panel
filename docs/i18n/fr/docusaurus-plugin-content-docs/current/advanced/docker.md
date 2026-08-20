---
sidebar_position: 1
---

# Docker et limites de ressources

Chaque instance de serveur tourne dans son propre **conteneur Docker**, isolé de
l'hôte et des autres serveurs.

## Isolation

| Couche      | Garantie                                      |
|-------------|-----------------------------------------------|
| Système de fichiers | Chaque serveur a son propre volume ; aucun monde partagé |
| Réseau      | Chaque serveur a son propre port interne      |
| Processus   | Isolation des processus par conteneur (aucun accès croisé) |
| Ressources  | Limites CPU et mémoire via Docker (cgroups)   |

## Limites de ressources

Configurées à la création ou à l'édition du serveur :

- **Mémoire (Mo)** — limite dure du conteneur. Un serveur qui la dépasse est tué
  par le noyau (OOM killer). Fixez-la au-dessus du tas JVM (`Xmx`).
- **CPU (%)** — plafond souple en pourcentage d'un cœur (100 = un cœur, 400 = quatre cœurs).

### Choisir sa mémoire

| Type de serveur          | Recommandé |
|--------------------------|------------|
| Vanilla (≤ 10 joueurs)   | 1024 Mo    |
| Paper avec plugins       | 2048 Mo    |
| Modpacks Fabric / Forge  | 3072–4096 Mo |

## Les conteneurs sous le capot

- Images : fournies par type de serveur (`nutty-panel/vanilla`, `nutty-panel/paper`, …)
- Réseau : les conteneurs rejoignent le réseau bridge du panel ; le Smart Proxy et
  l'agent Playit s'y connectent sur leur port interne
- Cycle de vie : `start` → `docker run`, `stop` → arrêt propre, `kill` → arrêt forcé

## Débogage

La sortie console du serveur est capturée par le panel (onglet Console). Les erreurs
au niveau conteneur (échec de pull d'image, kill OOM…) y apparaissent aussi,
préfixées par les messages du conteneur.
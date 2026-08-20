---
sidebar_position: 1
---

# Aperçu de l'API

Nutty Panel expose une **API REST** sur le backend. La référence complète, toujours
à jour, est servie par le panel lui-même via Swagger UI :

> **`https://<votre-panel>/api/docs`**

Le document OpenAPI est généré en direct par NestJS — chaque endpoint, schéma et
erreur y est documenté. Cette page est une carte rapide de la surface de l'API.

## Authentification

La plupart des endpoints exigent un jeton :

- **Jetons d'accès JWT** — obtenus via `POST /api/auth/login`, rafraîchis via
  `POST /api/auth/refresh`. Envoyés comme `Authorization: Bearer <jeton>`.
- **Clés API** — jetons longue durée créés via `POST /api/auth/api-keys` (admin uniquement).
  Même en-tête Bearer.

### Rôles

| Rôle       | Capacités                                          |
|------------|----------------------------------------------------|
| `admin`    | Tout, y compris clés API et actions destructives   |
| `moderator`| Démarrer/arrêter des serveurs, gérer les fichiers  |
| `user`     | Voir et interagir avec les serveurs possédés       |

Les routes restreintes par rôle renvoient **403** quand le jeton n'a pas le rôle requis.

## Carte des endpoints

### Auth — `/api/auth`

| Méthode | Route            | Description                        |
|---------|------------------|------------------------------------|
| POST    | `login`          | Authentification, obtention JWT + refresh |
| POST    | `refresh`        | Rotation des jetons                |
| POST    | `logout`         | Révocation de la session courante  |
| GET     | `me`             | Profil de l'utilisateur courant    |
| POST    | `2fa/setup`      | Générer un secret TOTP             |
| POST    | `2fa/enable`     | Activer la 2FA avec un code        |
| POST    | `2fa/disable`    | Désactiver la 2FA                  |
| POST    | `api-keys`       | Créer une clé API (admin)          |
| GET     | `api-keys`       | Lister les clés API (admin)        |
| DELETE  | `api-keys/:id`   | Révoquer une clé API (admin)       |

### Serveurs — `/api/servers`

| Méthode | Route             | Description                     |
|---------|-------------------|---------------------------------|
| GET     | `/`               | Lister les serveurs             |
| GET     | `/:id`            | Détails d'un serveur            |
| PATCH   | `/:id`            | Mettre à jour (mémoire, CPU…)   |
| DELETE  | `/:id`            | Supprimer un serveur            |
| POST    | `/:id/start`      | Démarrer le serveur             |
| POST    | `/:id/stop`       | Arrêt propre                    |
| POST    | `/:id/restart`    | Redémarrer                      |
| POST    | `/:id/kill`       | Arrêt forcé                     |

### Backups — `/api`

| Méthode | Route                             | Description              |
|---------|-----------------------------------|--------------------------|
| POST    | `servers/:serverId/backups`       | Créer un backup          |
| GET     | `servers/:serverId/backups`       | Lister les backups       |
| POST    | `backups/:backupId/restore`       | Restaurer un backup      |
| DELETE  | `backups/:backupId`               | Supprimer un backup      |
| GET     | `servers/:serverId/backup-policy` | Obtenir la politique     |
| PATCH   | `servers/:serverId/backup-policy` | Modifier la politique    |

### Fichiers — `/api/servers/:serverId/files`

| Méthode | Route          | Description             |
|---------|----------------|-------------------------|
| GET     | `content`      | Lire un fichier         |
| PUT     | `content`      | Écrire un fichier       |
| POST    | `directories`  | Créer un répertoire     |
| POST    | `upload`       | Téléverser un fichier   |
| GET     | `download`     | Télécharger un fichier  |

### Intégrations — `/api`

| Méthode | Route                                        | Description                 |
|---------|----------------------------------------------|-----------------------------|
| GET     | `integrations/:provider/search`              | Rechercher CurseForge/Modrinth |
| POST    | `servers/:serverId/integrations/install`     | Installer un mod/modpack    |
| GET     | `servers/:serverId/integrations/installed`   | Lister le contenu installé  |
| DELETE  | `integrations/installed/:id`                 | Retirer du contenu installé |

### Métriques — `/api`

| Méthode | Route                        | Description            |
|---------|------------------------------|------------------------|
| GET     | `servers/:serverId/metrics`  | Métriques CPU/RAM live |

### Proxy — `/api/proxy`

| Méthode | Route      | Description                          |
|---------|------------|--------------------------------------|
| GET     | `status`   | Port public, état d'écoute, routes   |
| GET     | `routes`   | Routes avec statut en ligne          |
| POST    | `refresh`  | Reconstruire les routes et redémarrer (admin) |

### Playit — `/api/playit`

| Méthode | Route                        | Description                 |
|---------|------------------------------|-----------------------------|
| GET     | `status`                     | État de l'agent + nombre de tunnels |
| GET     | `tunnels`                    | Lister les tunnels          |
| GET     | `servers/:serverId/tunnels`  | Tunnel d'un serveur         |
| POST    | `servers/:serverId/tunnels`  | Créer un tunnel (admin)     |
| DELETE  | `servers/:serverId/tunnels`  | Supprimer un tunnel (admin) |

### Webhooks — `/api/webhooks`

| Méthode | Route      | Description                  |
|---------|------------|------------------------------|
| GET     | `events`   | Lister les événements disponibles |
| GET     | `:id`      | Détails + livraisons du webhook |
| DELETE  | `:id`      | Supprimer un webhook         |

### Auto-lifecycle — `/api/servers/:serverId/auto-start`

| Méthode | Route      | Description                        |
|---------|------------|------------------------------------|
| GET/POST/PATCH | `auto-start` | Lire / activer / configurer l'auto-start |
| (les réglages auto-stop suivent le même schéma) | | |

## Erreurs

Les erreurs utilisent les formats NestJS : un corps JSON avec `statusCode`, `message`
et `error` (ou `error` égal au nom de la classe d'exception, ex. `PlayitServerNotFoundError`).

| Statut | Signification                              |
|--------|--------------------------------------------|
| 400    | Payload invalide                           |
| 401    | Jeton manquant/invalide (ou échec d'auth Playit) |
| 403    | Le jeton n'a pas le rôle requis            |
| 404    | Ressource introuvable                      |
| 429    | Limite de débit (login throttling, API Playit) |
| 502/503| Échec amont (API Playit, agent)            |

## Essayez-le

Démarrez le panel et ouvrez `/api/docs` — chaque endpoint peut être exécuté
directement depuis le navigateur avec votre jeton.
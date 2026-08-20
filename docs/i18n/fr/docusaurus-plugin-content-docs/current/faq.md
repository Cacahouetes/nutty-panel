---
sidebar_position: 6
---

# FAQ

## Le serveur ne démarre pas

- **Regardez la console** — l'onglet Console montre la vraie erreur (version manquante,
  mod incompatible, conflit de port).
- **Mémoire trop faible** — la JVM a besoin de marge au-dessus de son tas : essayez
  au moins 2048 Mo.
- **Port déjà utilisé** — un autre processus (ou un autre serveur) occupe le port.
- **Incompatibilité de modpack** — le type/la version du modpack doit correspondre
  au serveur. Voir [Mods & modpacks](./guides/mods.md).

## Les joueurs ne peuvent pas se connecter

1. Le serveur tourne-t-il ? (Tableau de bord → statut)
2. Le **port est-il ouvert** dans le pare-feu de l'hôte ?
   ```bash
   ufw allow 25565/tcp   # ou votre port personnalisé
   ```
3. Utilisez-vous la bonne adresse ? La carte du serveur l'affiche ; avec le
   [Smart Proxy](./advanced/smart-proxy.md) utilisez `<nom>.<domaine>:25565`.
4. Derrière NAT ? Utilisez plutôt un [tunnel Playit.gg](./advanced/playit.md).

## « Impossible de se connecter » avec le Smart Proxy

- Le DNS wildcard `*.play.example.com` doit pointer vers votre panel.
- `PROXY_PUBLIC_PORT` doit être ouvert (défaut `25565`).
- Pas de serveur par défaut → les connexions à hostname inconnu sont refusées :
  définissez `PROXY_DEFAULT_SERVER_ID` (voir [Smart Proxy](./advanced/smart-proxy.md)).

## J'ai oublié le mot de passe admin

Arrêtez le panel, définissez un nouveau mot de passe dans `.env` et supprimez la ligne
utilisateur admin (ou supprimez le fichier de base de données pour réinitialiser) :

```bash
docker compose down
# modifiez .env → PANEL_ADMIN_PASSWORD
docker compose up -d
```

## Où sont mes fichiers de serveur ?

Chaque serveur a son propre répertoire sous le volume de données du panel. Utilisez
le [gestionnaire de fichiers](./guides/files.md) du tableau de bord — c'est plus sûr
que de modifier les fichiers directement sur l'hôte.

## Les backups échouent

- Vérifiez l'espace disque (`df -h`) : les backups ont besoin de place pour le monde.
- La rétention de la politique purge les anciens backups — gardez-la ≥ 1.
- La restauration nécessite un serveur arrêté.

## L'agent Playit est en erreur

- `PLAYIT_AGENT_BIN` doit pointer vers un vrai binaire exécutable.
- `PLAYIT_AGENT_SECRET` doit correspondre au secret de l'agent.
- Consultez `GET /api/playit/status` et les journaux du panel.

## Les webhooks ne sont pas livrés

- Vérifiez que l'URL accepte les `POST` et renvoie un 2xx.
- Les livraisons échouées sont réessayées automatiquement ; consultez la page de détail du webhook.
- Les payloads sont signés HMAC — si votre endpoint vérifie les signatures, le secret
  doit correspondre (voir [Webhooks](./advanced/webhooks.md)).

## Mettre à jour le panel

```bash
cd ~/nutty-panel
git pull
docker compose up -d --build
```

Les données et les serveurs sont conservés — ils vivent dans des volumes Docker,
pas dans le dépôt.

## Désinstaller

```bash
bash infra/uninstall.sh
```

Cela supprime les conteneurs et les volumes. Sauvegardez d'abord vos mondes !
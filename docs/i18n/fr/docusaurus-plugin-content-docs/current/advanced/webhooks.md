---
sidebar_position: 4
---

# Webhooks

Les webhooks notifient des services externes (Discord, Slack, endpoints personnalisés)
quand des événements se produisent sur le panel — serveur démarré, backup terminé, etc.

## Créer un webhook

1. Ouvrez **Paramètres → Webhooks**.
2. Cliquez sur **Nouveau webhook** et choisissez :
   - **URL** — où envoyer le POST (les URLs de webhook Discord/Slack fonctionnent directement)
   - **Événements** — auxquels s'abonner (voir ci-dessous)
3. Enregistrez. Le webhook reçoit un payload signé pour chaque événement souscrit.

## Événements disponibles

| Événement                   | Points saillants du payload                |
|-----------------------------|--------------------------------------------|
| `server.started`            | id du serveur, nom, port                   |
| `server.stopped`            | id du serveur, nom, raison                 |
| `server.backup.completed`   | id du serveur, id du backup, taille        |
| `server.backup.failed`      | id du serveur, message d'erreur            |
| `backup.policy.changed`     | id du serveur, nouvel intervalle / rétention |

Consultez `GET /api/webhooks/events` (Swagger) pour la liste en direct.

## Payload et signature

Chaque requête est un `POST` avec un corps JSON :

```json
{
  "event": "server.started",
  "occurredAt": "2026-08-20T10:00:00Z",
  "data": { "serverId": "lobby", "name": "Lobby", "port": 25566 }
}
```

Les payloads sont signés avec **HMAC-SHA256**. Vérifiez la signature de votre côté
pour être sûr que la requête vient bien du panel :

```bash
# HMAC du corps brut avec le secret du webhook
openssl dgst -sha256 -hmac "<secret-du-webhook>"
```

## Livraison

- Les webhooks sont réessayés automatiquement en cas d'échec, avec backoff.
- Les livraisons échouées sont visibles dans le détail du webhook.

## Discord / Slack

Les URLs de webhook Discord et Slack sont supportées nativement — créez le webhook
dans les paramètres du canal et collez l'URL dans le panel. Le payload est formaté
pour l'affichage sur les deux plateformes.
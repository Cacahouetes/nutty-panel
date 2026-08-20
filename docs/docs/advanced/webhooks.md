---
sidebar_position: 4
---

# Webhooks

Webhooks notify external services (Discord, Slack, custom endpoints) when events
happen on the panel — server started, backup completed, and more.

## Creating a webhook

1. Open **Settings → Webhooks**.
2. Click **New webhook** and choose:
   - **URL** — where to POST the event (Discord/Slack webhook URLs work directly)
   - **Events** — which events to subscribe to (see below)
3. Save. The webhook receives a signed payload for every subscribed event.

## Available events

| Event                     | Payload highlights                          |
|---------------------------|---------------------------------------------|
| `server.started`          | server id, name, port                       |
| `server.stopped`          | server id, name, reason                     |
| `server.backup.completed` | server id, backup id, size                  |
| `server.backup.failed`    | server id, error message                    |
| `backup.policy.changed`   | server id, new interval / retention         |

Check `GET /api/webhooks/events` (Swagger) for the live list.

## Payload & signing

Every request is a `POST` with a JSON body:

```json
{
  "event": "server.started",
  "occurredAt": "2026-08-20T10:00:00Z",
  "data": { "serverId": "lobby", "name": "Lobby", "port": 25566 }
}
```

Payloads are signed with **HMAC-SHA256**. Verify the signature on your side to be
sure the request really comes from the panel:

```bash
# HMAC of the raw body with the webhook secret
openssl dgst -sha256 -hmac "<webhook-secret>"
```

## Delivery

- Webhooks are retried automatically on failure with backoff.
- Failed deliveries are visible in the webhook details.

## Discord / Slack

Discord and Slack webhook URLs are supported out of the box — create the webhook
in the channel settings and paste the URL into the panel. The payload is formatted
for display in both platforms.
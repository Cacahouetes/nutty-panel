---
sidebar_position: 3
---

# Backups

Les backups capturent les fichiers et le monde d'un serveur pour pouvoir le restaurer plus tard.

## Backup manuel

1. Ouvrez le serveur, puis l'onglet **Backups**.
2. Cliquez sur **Créer un backup**.
3. Le panel arrête brièvement le serveur (ou prend un instantané à chaud), archive
   les fichiers et stocke le backup.

## Restaurer un backup

1. Ouvrez l'onglet **Backups** et sélectionnez un backup.
2. Cliquez sur **Restaurer**.
3. Le serveur est arrêté, les fichiers actuels sont remplacés par le backup, et vous
   pouvez le redémarrer.

La restauration est destructive pour l'état actuel — les fichiers sont remplacés.
En cas de doute, créez d'abord un backup de l'état actuel.

## Backups automatiques (politique)

Une **politique de backup** par serveur contrôle les sauvegardes planifiées :

- **Activé** — exécute les backups automatiquement
- **Intervalle** — fréquence des backups (ex. toutes les 6 heures)
- **Rétention** — nombre de backups conservés (les plus anciens sont purgés)

Configurez-la depuis l'onglet **Backups** du serveur → *Politique*.

## Stockage

Les backups sont stockés dans le répertoire de données du panel. Le stockage distant
(S3/SFTP) est sur la feuille de route ; pour l'instant vous pouvez télécharger un
backup et le copier ailleurs pour le conserver.
# Naymoon Cartel — Dashboard des demandes d'abonnement

Dashboard privé dans l'identité visuelle Naymoon. Il lit les demandes depuis le Google Sheet fourni, permet de modifier le statut et calcule les totaux filtrés.

## Fonctions

- Connexion par mot de passe avec cookie HttpOnly signé.
- Lecture sécurisée des demandes via une API Vercel.
- Statuts persistants dans Google Sheet : `pending`, `paid`, `cancelled`.
- Ajout automatique de la colonne `status` si elle n'existe pas.
- Totaux en attente, payés et annulés.
- Filtre par période, statut et recherche.
- Consultation et copie de la commande SQL.
- Interface responsive dans le thème Naymoon.

## 1. Installer Google Apps Script

1. Ouvrir le Google Sheet.
2. Extensions → Apps Script.
3. Remplacer le contenu de `Code.gs` par `apps-script/Code.gs`.
4. Dans Apps Script : Paramètres du projet → Propriétés du script.
5. Ajouter `SHEET_API_KEY` avec une longue valeur aléatoire.
6. Déployer → Nouveau déploiement → Application Web.
7. Exécuter en tant que : Moi.
8. Qui a accès : Tout le monde.
9. Copier l'URL se terminant par `/exec`.

L'URL est publique, mais toutes les opérations sont refusées sans `SHEET_API_KEY`.

## 2. Déployer sur Vercel

Importer ce dossier dans Vercel puis ajouter :

```env
ADMIN_PASSWORD=naymooncartelgodadminpasskey22577
AUTH_SECRET=une-longue-cle-aleatoire-differente
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
SHEET_API_KEY=la-meme-cle-que-dans-apps-script
```

Relancer un déploiement après l'ajout des variables.

## 3. Colonne de statut

Le script ajoute automatiquement une colonne `status` à droite des colonnes existantes. Toute ligne sans statut est affichée comme `pending`.

Correspondance :

- `pending` → En attente
- `paid` → Payé
- `cancelled` → Annulé

## Développement local

```bash
npm install
npm run dev
```

Les routes `/api` sont des fonctions Vercel : le test complet de l'authentification et des mises à jour se fait avec `vercel dev` ou après déploiement.

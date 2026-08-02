# Naymoon Cartel — version universelle

Cette version ne contient aucune fonction serveur et aucune variable d’environnement.
Elle se déploie sur Vercel et Netlify.

## Build
- Commande : `npm run build`
- Dossier publié : `dist`

## Données
La feuille Google Sheets publique est lue via l’export CSV avec l’ID intégré au code.

## Statuts
Les statuts sont enregistrés dans le `localStorage` du navigateur. Ils ne sont donc pas partagés entre plusieurs appareils et ne modifient pas la feuille Google.

## Mot de passe
Le mot de passe est inclus dans le JavaScript comme demandé. Il ne constitue pas une sécurité serveur forte : une personne technique peut le retrouver dans les fichiers publics.

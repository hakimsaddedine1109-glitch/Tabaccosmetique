# Bureau Tabac & Cosmétique — PWA

Application de gestion (caisse, stock, crédit clients, tableau de bord) pour un
bureau tabac et cosmétique. 100% locale : toutes les données sont stockées sur
la tablette (IndexedDB via Dexie.js), aucun serveur, aucun compte à créer.

## Structure

```
bureau-tabac-pwa/
  index.html          → page unique, 5 écrans
  manifest.webmanifest → rend l'appli installable sur la tablette
  service-worker.js    → mode hors-ligne
  css/style.css
  js/db.js             → schéma Dexie + fonctions base de données
  js/scanner.js         → scan caméra (ZXing)
  js/app.js             → logique des 5 écrans
  icons/                → icônes (à remplacer par ton propre logo si tu veux)
```

## Lancer le projet en local

Un service worker exige d'être servi en HTTP (pas en ouvrant le fichier
directement dans le navigateur avec `file://`). Le plus simple :

```bash
cd bureau-tabac-pwa
python3 -m http.server 8080
```

Puis ouvre `http://localhost:8080` sur la tablette (ou l'adresse IP de ton
ordinateur si la tablette est sur le même réseau Wi-Fi).

## Installer sur la tablette

Une fois la page ouverte dans Chrome sur la tablette : menu ⋮ →
« Ajouter à l'écran d'accueil ». L'appli s'ouvrira ensuite comme une vraie
appli, en plein écran, sans barre d'adresse.

## À savoir sur le scan de code-barres

Dexie et ZXing sont chargés depuis un CDN (`jsdelivr` / `unpkg`). La toute
première fois que l'appli est ouverte, **il faut une connexion internet** pour
que ces librairies soient téléchargées. Le service worker les met ensuite en
cache automatiquement : tous les lancements suivants fonctionnent hors-ligne,
scan de code-barres inclus.

Si tu préfères ne jamais dépendre d'internet, même la première fois, télécharge
les deux fichiers suivants et remplace les balises `<script src="https://...">`
dans `index.html` par des chemins locaux (ex. `js/vendor/dexie.min.js`) :
- https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.min.js
- https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js

## Prochaines pistes

- Filtrer le tableau de bord par période personnalisée
- Ajouter une catégorie "carburant / recharge téléphonique" si le bureau tabac
  en vend aussi
- Graphique d'évolution des ventes (ex. avec Chart.js)

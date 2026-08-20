COMIC VAULT V3 STABLE

Architecture reconstruite proprement. Aucun service worker : priorité à la stabilité.
Compatible avec la base existante :
IndexedDB: comic-vault
version: 1
store: comics

Fonctions intégrées :
- Accueil + statistiques
- Collection : carrousel tactile 3D + grille
- Fiches détaillées et modification
- Séries : regroupement, recherche, repérage des séries manquantes
- Tri numérique des tomes (1, 2, 3, 10...)
- Inférence prudente d'une série depuis les titres avec Tome / Vol. / # / N°
- Recherche et filtres
- Boîtes
- Favoris
- Export / import JSON
- tous les champs V2 conservés

Volontairement absents pour le premier test :
- service worker/cache hors-ligne
- recherche ISBN externe
- scanner caméra

INSTALLATION DEPUIS RECOVERY
1. Exporter d'abord les comics depuis Recovery et garder le JSON.
2. Dans le repository comics-vault, remplacer index.html, style.css, app.js et manifest.webmanifest.
3. SUPPRIMER sw.js du repository.
4. Conserver/remettre les 3 fichiers d'icônes.
5. Attendre le déploiement GitHub Pages.
6. Ouvrir l'adresse habituelle dans Safari.
7. Ne pas effacer les données Safari.

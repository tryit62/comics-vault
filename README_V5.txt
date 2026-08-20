COMIC VAULT V5 — LOCAL LIBRARY

OBJECTIF
L'application d'écran d'accueil devient la bibliothèque principale.
GitHub héberge le code et les 54 images de migration uniquement.
Après migration, les 54 couvertures sont copiées dans IndexedDB de l'app.

NOUVEAUX COMICS
- Photo sélectionnée depuis l'app
- miniature JPEG 240x360 créée AVANT stockage
- couverture détaillée JPEG max 1100x1650
- photo originale non conservée
- les deux images sont stockées comme Blob dans IndexedDB (pas Base64)

PERFORMANCES
- carrousel : 3 miniatures
- grilles : maximum 60 cartes rendues simultanément
- grande couverture chargée uniquement à l'ouverture d'une fiche
- nouvelle base indépendante : comic-vault-v5

SAUVEGARDE
- Export ZIP sans bibliothèque externe
- collection.json + covers/<id>-thumb.jpg + covers/<id>-full.jpg
- restauration ZIP intégrée

INSTALLATION / TEST
1. Garde V4.1 comme version de secours et le JSON Recovery.
2. Mets les fichiers V5 sur GitHub (les JPG déjà présents peuvent rester).
3. Ouvre d'abord le site Safari et vérifie que V5 démarre vide et reste fluide.
4. Ajoute 2 ou 3 comics TEST avec couvertures.
5. Ferme/réouvre et vérifie les images.
6. Exporte un ZIP, puis conserve-le.
7. Sur l'app d'écran d'accueil, V5 aura sa propre base.
8. Dans Réglages, utilise « Installer les 54 comics dans l'app » UNE FOIS.
9. Vérifie les 54 fiches + couvertures, ferme/réouvre.
10. Exporte immédiatement un ZIP V5.
11. Seulement après validation, commence les ~100 nouveaux comics.

IMPORTANT : ne supprime pas les sauvegardes historiques avant validation.

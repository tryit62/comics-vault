COMIC VAULT V4 FRESH

Cette version utilise une NOUVELLE base IndexedDB :
comic-vault-v4
Elle n'ouvre jamais l'ancienne base lourde comic-vault.

La sauvegarde Recovery fournie a été préparée hors iPad :
- 54 comics
- couvertures extraites du JSON géant
- miniature légère pour les listes
- image détaillée compressée
- seed.json ne contient plus les images Base64 géantes

INSTALLATION
1. Garde le JSON Recovery original.
2. Sur le repository comics-vault, remplace le contenu par LES FICHIERS/DOSSIERS de ce package :
   index.html
   style.css
   app.js
   seed.json
   dossier covers/
3. Ne mets PAS sw.js.
4. Ouvre le site dans Safari.
5. La V4 doit afficher 0 comics mais rester fluide : c'est normal, c'est une nouvelle base.
6. Va dans Plus > Réglages.
7. Appuie sur « Importer mes 54 comics préparés ».
8. Attends la fin de l'import.
9. Vérifie Collection, Séries, Recherche et plusieurs fiches.
10. Ne supprime l'ancienne base/données Safari qu'après validation complète.

Pour les NOUVEAUX comics, la photo choisie est réduite AVANT stockage.
Le carrousel ne crée que 3 couvertures à la fois.
Les grilles sont limitées à 80 éléments rendus simultanément.

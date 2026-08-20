COMIC VAULT — STABILITÉ + SÉRIES INTELLIGENTES

Cette version repart des 4 fichiers actuellement publiés par l'utilisateur.
La base reste STRICTEMENT :
IndexedDB = comic-vault
version = 1
store = comics

Nouveautés Séries :
- séries renseignées reconnues automatiquement ;
- repérage des comics dont le champ Série est vide ;
- inférence prudente depuis un titre finissant clairement par Tome/Vol./#/N° ;
- ouverture d'une série avec tous ses comics ;
- classement numérique par champ Tome / numéro ;
- prise en charge de Tome 1, Tome 2, Tome 10 dans le bon ordre (1,2,10 et non 1,10,2) ;
- si le champ Tome est vide, tentative prudente depuis le titre ;
- recherche de séries ;
- bouton Retrouver les séries pour isoler les fiches à compléter.

Stabilité :
- même base IndexedDB, aucune migration destructive ;
- app.js remis en cohérence avec tous les champs du formulaire ;
- service worker remplacé par une stratégie réseau d'abord pour HTML/JS/CSS ;
- suppression des anciens caches lors de l'activation ;
- aucune boucle de rechargement automatique ;
- scanner caméra laissé désactivé pour cette version de récupération.

MISE À JOUR :
Remplacer sur GitHub :
index.html
style.css
app.js
sw.js
Conserver manifest + icônes existants s'ils sont déjà présents.
NE PAS supprimer les données Safari.

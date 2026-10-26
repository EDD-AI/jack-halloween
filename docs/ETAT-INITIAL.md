# JACK — La nuit nous appartient

Jeu de soirée Halloween en français, pour un écran commun et 2 à 12 téléphones. La citrouille animée ouvre sa bouche sur la connexion. Le score se compte en ossements.

## Jouer

1. Ouvrir `/screen` sur la télévision ou l’ordinateur, puis créer une salle.
2. Scanner le QR code avec chaque téléphone, choisir un pseudo et préparer un thème.
3. Dès que deux joueurs ont rejoint et que tous ont validé « Mon piège est prêt », l’écran commun ou le premier téléphone peut lancer la partie. Le bouton indique « Lancer à 2 joueurs » pour un duo.

L’écran commun est un affichage, pas un joueur : prévoir un ordinateur (ou une télévision avec navigateur) et deux téléphones pour jouer à deux. Le salon précise les joueurs qui doivent encore valider leur thème. La finale en équipes reste un bonus dès quatre joueurs ; elle ne bloque jamais le quiz, le bluff, la mémoire ni le classement à deux.

Les sessions sont privées à chaque onglet et restaurées après rechargement. Le serveur fait autorité sur les manches, délais, réponses et scores. Internet est nécessaire. Une salle expire après 12 heures. L’hébergement est public : toute personne disposant du lien peut ouvrir le jeu et rejoindre une salle avec son code.

## Manches

- **Quiz à thèmes :** une question par joueur, 25 secondes, 10 os pour une bonne réponse.
- **Apparitions :** 12 secondes de préparation, puis 9 secondes d’observation sur l’écran commun et 22 secondes pour répondre. Les téléphones ne montrent pas la scène. Le nombre et la position des fantômes et des ossements sont générés par le moteur et servent à calculer la réponse.
- **Téléphone hanté :** avant une apparition, chacun peut désigner secrètement une cible. Un seul essai de vol par partie. Si le voleur répond juste et sa cible se trompe, jusqu’à 5 os sont transférés. Le solde ne devient jamais négatif. Plusieurs vols sur la même cible se partagent équitablement les os disponibles.
- **Le grand mensonge :** 45 secondes pour inventer une fausse réponse, puis 25 secondes pour voter parmi les propositions anonymes. La vérité rapporte 10 os ; chaque personne trompée rapporte 5 os à l’auteur. Impossible de voter pour son propre mensonge.
- **Le dernier rituel :** dès 4 joueurs, deux équipes et les mêmes 12 mots maximum en trois passages : parole, un mot, mime. Tours de 35 secondes ; les personnes qui font deviner alternent. Seul leur téléphone reçoit la carte secrète. Un mot trouvé donne 5 os à chaque membre de l’équipe. Les joueurs valident eux-mêmes les réponses prononcées.

Les réponses peuvent terminer une manche avant le délai quand tout le monde a répondu. L’hôte poursuit après chaque résultat. Pause, reprise et nouvelle partie sont disponibles.

## Thèmes et limites

12 thèmes préparés, 36 questions de quiz et 4 questions de bluff sont fournis dans `lib/questions.ts`. Chaque thème possède également des mots pour la finale. Pour un thème libre, son auteur écrit sa question, la bonne réponse, trois mauvaises réponses et au moins deux mots à faire deviner. Les entrées sont validées avant de rendre le joueur prêt.

Cette version n’intègre pas de modèle de génération de questions. Elle ne prétend pas produire automatiquement des questions fiables sur n’importe quel sujet. La bibliothèque actuelle convient à une première partie et devra être enrichie pour limiter les répétitions.

## Direction artistique et animations

Noir chaud, orange braise, ivoire et vert spectral. Citrouille, manoir, apparition et ossement sont des images originales générées avec image_gen, utilisées sans retouche raster. Les prompts sont conservés dans `docs/`.

Animations CSS : mâchoires de la citrouille, flottement, braises, arrivée des manches, matérialisation des fantômes, horloge, envol d’ossements, cartes et victoire. Les compteurs de score sont animés avec requestAnimationFrame. Sons synthétiques facultatifs et vibration compatible ; le son est désactivé initialement. La préférence système de réduction des mouvements est respectée.

## Architecture

- `app/JackApp.tsx` : interface mobile et écran commun ; `app/screen/page.tsx` sélectionne l’entrée écran.
- `lib/game.ts` : moteur pur et vues filtrées par rôle.
- `app/api/rooms/route.ts` : API D1, jetons privés, écritures atomiques avec révision, délais serveur, actions idempotentes et validation.
- `db/schema.ts` et `drizzle/` : schéma et migrations append-only.
- Actualisation : environ 900 ms au premier plan, 2,5 secondes en arrière-plan. Reconnexion affichée en cas d’échec réseau.

Utiliser les helpers Sites pour installation, prévisualisation, compilation et publication. Ne jamais modifier une migration publiée.

## Vérifications

`node tests/game.test.mjs` vérifie permissions, absence de secrets dans les vues, idempotence, horloges et pause, scores, partage des vols, bluff, finale complète en trois passages, thèmes libres et limite de 12 joueurs. TypeScript et compilation de production sont également vérifiés.

Parcours navigateur avec un écran et quatre sessions distinctes dans des cadres mobiles 390 × 844 : connexion, thèmes, quiz, mémoire, un vol effectif de 5 os, soumission des mensonges, délais automatiques, pause/reprise, entrée en finale et confidentialité de la carte. Une panne du navigateur de test a interrompu la validation interactive de la finale ; ses trois passages sont couverts par les tests du moteur. Le lancement depuis le premier téléphone avec exactement deux joueurs et la synchronisation sur les trois vues ont été vérifiés en navigateur après clarification du salon. Un test de régression parcourt aussi toutes les manches à deux, le classement final et une nouvelle partie, avec lancement depuis l’écran ou depuis le téléphone hôte. Aucun test sur téléphone physique, télévision réelle ou réseau de soirée n’a été réalisé.

Les captures de navigateur sont omises de cet export ; les assets du jeu sont inclus dans `public/`.

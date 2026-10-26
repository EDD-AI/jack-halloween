# Reprise du projet JACK

## Objectif produit

Un party game Halloween, proche du fonctionnement téléphones + écran commun de Jackbox, avec quiz personnalisés, bluff et une finale inspirée de la succession parole / un mot / mime. Le joueur choisit un sujet qu’il connaît et susceptible de piéger les autres. L’interface téléphone doit rester très simple : une action principale et peu de texte. Coco / Studio EDDA est responsable de la direction artistique.

La citrouille aux yeux en X est la mascotte. Au lancement, sa bouche s’ouvre et dévoile le menu. Ambiance noire et orange braise, ivoire pour les ossements, vert pâle spectral pour les fantômes. Préserver cette direction et les animations déjà présentes.

## État livré

Export du commit de production `30347e2561628d61e2222b18ab8cfa2316218fc4` (version 3). L’export ajoute cette documentation, les commandes `test`, `typecheck`, `db:local` et la configuration de base locale. Le code du jeu, l’API, les styles, les questions et les migrations sont inchangés par rapport à ce commit.

Le Site existant est public à la demande de son propriétaire. Son déploiement et sa base ne sont pas transférés par ce dépôt. Aucun changement du code GitHub ne mettra à jour ce Site automatiquement. Le développeur devra choisir où héberger la suite.

Les anciennes captures de navigateur ne sont pas incluses dans ce dossier. Les images qui composent réellement le jeu sont toutes dans `public/`.

## Règles implémentées

- 2 à 12 joueurs ; le créateur de l’écran commun ne compte pas comme joueur.
- Le premier téléphone à rejoindre contrôle aussi la partie. Les jetons de session restent privés ; les identifiants publics des joueurs sont séparés.
- Tous les joueurs valident leur thème avant le lancement. Le salon indique explicitement les thèmes manquants et affiche **Lancer à 2 joueurs** pour un duo.
- Quiz : une question issue du thème de chaque joueur, 25 secondes, 10 os pour une réponse juste.
- Apparitions : 12 secondes pour préparer un éventuel vol ; 9 secondes pour observer la scène sur l’écran commun ; 22 secondes pour répondre. Les fantômes et les os sont des objets comptables placés par le moteur sur un décor vide.
- Vol : un essai par joueur et par partie. Si le voleur répond juste et sa cible faux, il récupère jusqu’à 5 os. Pas de score négatif ; les vols simultanés partagent les os disponibles.
- Bluff : 45 secondes pour écrire un mensonge et 25 secondes pour voter. La vérité vaut 10 os ; chaque vote sur un mensonge rapporte 5 os à son auteur. Les doublons sont regroupés et on ne vote pas pour son propre mensonge.
- Dès 4 joueurs, finale en deux équipes. Les mêmes mots reviennent en trois passages : parole, un seul mot, mime. Tours de 35 secondes ; un mot trouvé rapporte 5 os à chaque membre de l’équipe. La carte est transmise seulement au téléphone de celui qui fait deviner.
- À 2 ou 3 joueurs, la partie se termine normalement après les manches communes, sans finale en équipes.

## Architecture et contraintes à préserver

`lib/game.ts` est un moteur pur. Ses fonctions créent les salles, ajoutent les joueurs, authentifient les sessions, appliquent les actions, avancent les délais et construisent les vues par rôle.

`view()` ne doit jamais révéler les bonnes réponses avant le résultat, les jetons des autres joueurs, les cibles des vols, les auteurs des mensonges avant leur révélation ni une carte privée à un autre joueur. Ne pas importer la banque de questions dans le bundle client. `GameView` est importé uniquement comme type.

L’API stocke le JSON de partie dans D1. La colonne `revision` sert au contrôle de concurrence : mise à jour conditionnelle et répétition en cas de collision. Les actions récentes sont dédupliquées par `actionId`. Le serveur vérifie `phaseId` et `cardVersion` pour les actions pouvant arriver en retard. La fermeture utilise un DELETE conditionné par la révision.

Actualisation par polling (environ 900 ms visible, 2,5 s en arrière-plan), horloges corrigées à partir de l’heure serveur, pause qui décale les délais. Les changements de phase sont appliqués lorsqu’une requête arrive ; il n’y a pas de scheduler indépendant. La session est enregistrée dans sessionStorage, par onglet.

Les migrations publiées sont append-only. `players` est un vestige de la première version ; l’état courant se trouve dans `rooms.state`. Ne pas modifier une migration existante pour mettre à jour une base utilisée.

## Animations et visuels

Les images originales ont été générées via image_gen. Les prompts sont documentés dans `docs/game-asset-prompts.txt` et `docs/pumpkin-prompt.txt`. La citrouille est une seule image découpée par deux masques CSS complémentaires. Les yeux et la bouche appartiennent à l’image ; le menu reste du vrai HTML.

Animations : ouverture, flottement, braises, transitions de manches, apparitions, compteur animé, vol d’os, cartes et victoire. Audio synthétique facultatif, désactivé au départ. Vibrations lorsqu’elles sont compatibles. Respect de prefers-reduced-motion.

Les polices sont Nimbus Sans, Nimbus Sans Narrow et Nimbus Mono PS (URW). Leur notice est dans `public/fonts/NOTICE-URW.txt` et le texte AGPL correspondant dans `public/fonts/AGPL-3.txt`. Conserver les notices des dépendances et des fichiers vendored.

## Tests et vérifications

Le moteur a été testé pour les permissions, le filtrage des secrets, l’idempotence, les horloges, les scores, les vols simultanés, le bluff, la finale en trois passages, les thèmes libres et la limite de joueurs. Le test à deux parcourt les cinq manches, le classement et le redémarrage, avec lancement par l’écran ou par le premier téléphone.

Le prototype a été compilé et vérifié avec TypeScript. Des sessions navigateur distinctes ont servi à vérifier l’écran commun, les téléphones, le lancement à deux, le lancement à quatre, la mémoire, un vol effectif, la soumission des mensonges, la pause et l’entrée dans la finale. La finale complète est couverte par les tests du moteur ; un blocage de l’outil navigateur a interrompu son dernier test interactif.

Aucun test réalisé sur téléphone physique, télévision réelle ou réseau de la fête. La compatibilité iOS/Safari, la mise en veille, la reconnexion après perte réseau et la lisibilité sur télé doivent être validées.

## Priorités pour le développeur

1. Faire une vraie partie à deux avec un ordinateur et deux téléphones, puis à quatre. Observer précisément les blocages remontés et tester les thèmes non validés, les onglets rechargés et les joueurs déconnectés.
2. Installer un hébergement et une base appartenant au propriétaire, avec un déploiement reproductible. Ajouter la limitation des requêtes de création/join et les protections contre le spam avant diffusion large.
3. Définir la génération de questions par thème libre : fournisseur, clé côté serveur, budget, validation JSON, contrôle de qualité, gestion des délais et solution de repli. Aucune intégration IA n’est présente aujourd’hui.
4. Enrichir et faire relire les questions. Prévoir un mécanisme anti-répétition sur plusieurs parties.
5. Améliorer la gestion de la reconnexion : un onglet perdu ne récupère pas automatiquement son identité. Définir une règle pour les départs en cours de partie et la reprise de contrôle.
6. Décider si un vrai mode de test sans écran commun ou une finale à deux sont souhaités. Ce ne sont pas des modes déjà implémentés ; les ajouter demande d’adapter la mémoire et les règles.
7. Optimiser le poids des images et les performances mobiles en préservant la direction artistique ; séparer progressivement les vues du grand composant `JackApp.tsx`.

## Livraison Git

L’archive de remise contient une copie lisible du code et `jack-halloween.bundle`. Ce dernier est un véritable dépôt Git autonome avec une branche `main` et un commit de remise.

```sh
git clone jack-halloween.bundle jack-halloween-dev
cd jack-halloween-dev
```

Pour publier après création d’un dépôt GitHub vide, remplacer l’URL ci-dessous par son URL réelle. Cela n’accorde aucune autorisation supplémentaire sur le Site initial.

```sh
git remote rename origin livraison
git remote add origin URL_DU_DEPOT_GITHUB
git push -u origin main
```

La copie du répertoire `jack-halloween/` peut aussi être ouverte directement dans un éditeur. Le bundle n’inclut aucun secret, aucune donnée de partie et aucun dossier node_modules.

## Vérification de cet export

Tests du moteur, vérification TypeScript, application des deux migrations sur une nouvelle base locale et compilation du profil portable : réussis. La compilation a réutilisé les dépendances déjà installées du prototype ; une installation neuve depuis les registres n’a pas été répétée. Le dépôt Git de remise est vérifié par clonage du bundle.

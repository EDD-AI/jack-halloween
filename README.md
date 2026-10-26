# JACK — La nuit nous appartient

Jeu de soirée Halloween créé pour Studio EDDA. Application web française avec un écran commun et 2 à 12 téléphones, une citrouille qui ouvre sa bouche sur le menu et des scores en ossements.

Ce dépôt est un dossier de reprise du prototype publié. Il contient le code source, les images originales, les polices et leurs notices, les migrations et les tests. Les fichiers du jeu correspondent à la version Sites 3, commit source `30347e2561628d61e2222b18ab8cfa2316218fc4`.

**À lire en premier : [REPRISE.md](REPRISE.md).**

## Lancer localement

Prérequis : Node.js 24, Git et pnpm 11.25.0 (la version est fixée dans `package.json`). Utiliser le terminal dans ce dossier.

```sh
pnpm install --frozen-lockfile
pnpm db:local
pnpm dev
```

Ouvrir l’adresse affichée par le serveur, normalement `http://localhost:5173`. La commande `db:local` applique les migrations uniquement à une base SQLite locale, dans `.wrangler/state`. Elle peut être répétée : Wrangler mémorise les migrations appliquées.

```sh
pnpm test
pnpm typecheck
pnpm build
```

`pnpm start` sert le build local après compilation. Utiliser l’adresse annoncée dans le terminal. Si pnpm n’est pas installé, installer exactement la version indiquée dans `packageManager` avec le gestionnaire de votre environnement.

Les anciens scripts `install:ci` et `scripts/install-*.sh` viennent du starter Sites Linux. Pour une reprise hors Sites, employer l’installation pnpm ci-dessus.

## Tester à deux

- Ouvrir `/screen` sur l’ordinateur et créer une salle.
- Ouvrir la racine du site dans deux sessions distinctes, rejoindre le même code avec deux pseudos.
- Choisir un thème puis valider **Mon piège est prêt** dans chaque session.
- Le bouton **Lancer à 2 joueurs** démarre cinq manches (quiz, mémoire et bluff) puis le classement.

L’écran commun n’est pas un joueur. Pour une vraie partie à deux : un ordinateur et deux téléphones. Le mode parole / un mot / mime s’ajoute dès quatre joueurs. Le serveur local n’est pas automatiquement accessible depuis un téléphone : configurer l’écoute réseau et le pare-feu, ou déployer sur une adresse HTTPS accessible à tous. Ne pas utiliser `localhost` sur les téléphones pour viser l’ordinateur.

## Fichiers essentiels

| Fichier | Rôle |
| --- | --- |
| `app/JackApp.tsx` | Toutes les vues mobiles et écran commun, sessions, animation et audio |
| `app/globals.css` | Direction artistique, responsive et animations |
| `lib/game.ts` | Moteur, scores, transitions et filtrage des informations privées |
| `lib/questions.ts` | 12 thèmes, 36 QCM, 4 questions de bluff et mots de finale |
| `app/api/rooms/route.ts` | API serveur, authentification des sessions et persistance D1 |
| `db/schema.ts`, `drizzle/` | Schéma et migrations |
| `tests/game.test.mjs` | Tests du moteur, dont parcours complet à deux |
| `public/assets/` | Citrouille, fantôme, ossement et manoir |
| `docs/` | Prompts des visuels et état du prototype initial |

## Hébergement

Le backend utilise **Cloudflare Workers et D1**, via Vinext et Vite. Ce n’est pas un site HTML statique : GitHub Pages seul ne permet pas de faire fonctionner les salles partagées.

Le dépôt ne contient aucune base de production, aucun jeton de joueur et aucun secret d’hébergement. Le lien vers le Site existant n’est pas une dépendance du moteur. Son identifiant de publication a été retiré de `.openai/hosting.json` pour éviter qu’une reprise se publie sur le projet d’origine.

Pour une nouvelle production Cloudflare, le développeur doit créer une base D1, remplacer le binding de développement dans `vite.config.ts`, ajouter sa configuration de déploiement et appliquer les migrations sur sa propre base avant publication. Le fichier `wrangler.local.json` et son identifiant nul servent uniquement au développement local. Ne pas déployer le build avec cet identifiant factice.

## État et limites

Prototype jouable, pas une version finale testée en soirée. Les questions libres ne sont pas générées par IA : le joueur écrit une question, ses réponses et des mots à faire deviner. Le catalogue initial est petit. La finale est validée par les joueurs eux-mêmes, sans reconnaissance vocale. Les salles expirent après 12 heures et la reconnexion dépend du même onglet.

Les informations détaillées, les règles, les priorités et la portée exacte des tests se trouvent dans [REPRISE.md](REPRISE.md). Les notices tierces sont conservées ; aucune licence open source générale n’a été choisie pour le projet de Studio EDDA.

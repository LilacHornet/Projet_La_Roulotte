# La Roulotte — API

API REST de click & collect pour le food truck La Roulotte.

## Palier visé et état

- **Palier visé :** 
- **État :** Palier 1

## Démarrage

Avant le premier démarrage, copier `.env.example` vers `.env`, puis remplacer `JWT_SECRET` par une clé secrète locale d’au moins 16 caractères. Ne jamais publier le fichier `.env`.

Depuis la racine du projet, exécuter ces cinq commandes :

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

L’API démarre sur `http://localhost:3000`.

## Configuration

Les variables sont documentées dans `.env.example`.

| Variable | Rôle |
|---|---|
| `PORT` | Port HTTP de l’API |
| `DATABASE_URL` | URL de la base SQLite |
| `JWT_SECRET` | Secret JWT obligatoire, d’au moins 16 caractères |
| `JWT_EXPIRES_IN` | Durée de validité du jeton |
| `CORS_ORIGIN` | Origine autorisée pour le front |


## Schéma de données

Le schéma est défini dans `prisma/schema.prisma`.

- `User` peut posséder plusieurs `Order`.
- `Category` regroupe plusieurs `Dish`.
- `Dish` et `Allergen` sont liés plusieurs-à-plusieurs.
- `Order` contient plusieurs `OrderItem`.
- Chaque `OrderItem` référence un plat, une quantité et son `unitPriceCents`. Ce prix conserve le montant appliqué au moment de la commande.
- La clé composée `(orderId, dishId)` interdit d’ajouter deux fois le même plat à une commande.
- Les rôles possibles sont `CUSTOMER`, `STAFF` et `ADMIN`.
- Les statuts de commande définis actuellement sont `RECEIVED`, `PREPARING`, `READY`, `PICKED_UP` et `CANCELLED`.

Le seed charge les catégories, allergènes, plats et comptes de démonstration depuis `donnees/menu.json`. Les mots de passe sont hachés avec le module d’authentification fourni.

## Architecture et choix de conception

L’application sépare les responsabilités par domaine : routes, contrôleurs, services et repositories. Les modules se trouvent dans `src/modules/`.

| Pattern ou choix | Problème résolu dans ce projet | Fichiers concernés |
|---|---|---|
| **MVC et couches** | Sépare le routage HTTP, la réception des requêtes, les règles métier et l’accès aux données afin de ne pas concentrer toute la logique dans les routes. | `src/modules/menu/`, `src/modules/orders/`, `src/modules/health/` |
| **Repository** | Évite que les services dépendent directement de Prisma. Les tests peuvent remplacer l’accès à la base par des repositories mémoire. | `src/modules/menu/menu.repository.ts`, `src/modules/orders/order.repository.ts` |
| **Adaptation de la persistance** | Traduit les opérations des interfaces repository en appels Prisma, ce qui isole les services de l’implémentation de la base. | `PrismaMenuRepository` et `PrismaOrderRepository` dans les fichiers repository correspondants |
| **Injection de dépendances et composition root** | Assemble les implémentations réelles au démarrage et permet de construire une application de test avec des dépendances mémoire. | `src/container.ts`, `src/app.ts` |
| **Singleton** | Évite de créer plusieurs clients Prisma pour accéder à la même base. | `src/db/prisma.ts` |
| **Factory** | Construit l’authentification avec le repository utilisateur et la configuration JWT de l’application. | `createAuth` dans `src/fourni/auth/auth.ts`, appelé depuis `src/container.ts` |
| **DTO** | Contrôle les champs envoyés par l’API et évite d’exposer directement les objets de persistance. | `src/modules/menu/menu.dto.ts`, `src/modules/orders/order.dto.ts` et le DTO fourni par le module d’authentification |

Le module `src/fourni/auth/` est fourni et ne doit pas être modifié. Le repository utilisateur qui le relie à Prisma se trouve dans `src/modules/users/user.repository.ts`.

## Répartition du travail

- **Hadrien :** [tâches et fichiers réalisés]
- **Corentin :** [tâches et fichiers réalisés]
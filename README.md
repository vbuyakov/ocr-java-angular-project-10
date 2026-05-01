# Your Car Your Way — PoC Support Chat

**Auteur** : Viktor BUIAKOV, Lead Developer  
**Contexte** : Preuve de concept (PoC) de la fonctionnalité de support client en temps réel pour la plateforme centralisée Your Car Your Way.

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Prérequis](#2-prérequis)
3. [Structure du dépôt](#3-structure-du-dépôt)
4. [Mise en place de l'environnement](#4-mise-en-place-de-lenvironnement)
5. [Lancer le projet](#5-lancer-le-projet)
6. [Comptes de test](#6-comptes-de-test)
7. [Architecture technique](#7-architecture-technique)
8. [Modèle de données](#8-modèle-de-données)
9. [API — référence rapide](#9-api--référence-rapide)
10. [Tests](#10-tests)
11. [UX features](#11-ux-features)
12. [How to demo](#12-how-to-demo)
13. [Limitations (PoC)](#13-limitations-poc)
14. [Décisions techniques](#14-décisions-techniques)

---

## 1. Vue d'ensemble

Ce dépôt contient la **preuve de concept du tchat de support client** de la plateforme Your Car Your Way. Il démontre la faisabilité de l'architecture retenue :

- **Communication en temps réel** via WebSocket + STOMP entre un client (`CLIENT`) et un agent de support (`AGENT`)
- **Authentification JWT** stateless
- **Persistance** des messages via PostgreSQL + Flyway
- **Interface Angular** complète pour les deux rôles

La PoC couvre **uniquement la fonctionnalité de tchat** — elle ne constitue pas une application métier complète.

---

## 2. Prérequis

### Pour lancer avec Docker (recommandé)

| Outil | Version minimale | Vérification |
|---|---|---|
| Docker | 24+ | `docker --version` |
| Docker Compose | 2.20+ | `docker compose version` |

### Pour développer en local (sans Docker)

| Outil | Version | Vérification |
|---|---|---|
| Java (JDK) | 21 | `java -version` |
| Node.js | 24.11.0 (voir `.nvmrc`) | `node --version` |
| npm | 11+ | `npm --version` |
| PostgreSQL | 16 | `psql --version` |

> **Astuce nvm :** Si tu utilises nvm, lance `nvm use` dans le dossier `/web` — le fichier `.nvmrc` sélectionnera automatiquement la bonne version de Node.

---

## 3. Structure du dépôt

```
.
├── api/                        # Backend Spring Boot (Java 21)
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/ycyw/api/
│   │   │   │   ├── auth/           # Inscription, connexion, JWT
│   │   │   │   ├── tchat/          # Logique métier du tchat
│   │   │   │   │   ├── config/     # Config WebSocket + STOMP
│   │   │   │   │   ├── model/      # Entités JPA (Chat, ChatMessage)
│   │   │   │   │   ├── service/    # ChatService, ChatAccessService
│   │   │   │   │   ├── web/
│   │   │   │   │   │   ├── rest/   # ChatRestController, AgentChatRestController
│   │   │   │   │   │   └── ws/     # ChatStompController (STOMP)
│   │   │   │   ├── user/           # Modèle utilisateur, profil
│   │   │   │   ├── config/         # SecurityConfig, OpenApiConfig
│   │   │   │   └── security/       # JwtAuthenticationFilter, JwtService
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       └── db/migration/   # Flyway — V1__initial_schema.sql
│   │   └── test/                   # Tests unitaires, slice, E2E
│   ├── build.gradle
│   └── Dockerfile                  # Multi-stage build (Gradle → JRE Alpine)
│
├── web/                        # Frontend Angular 21
│   ├── src/app/
│   │   ├── auth/               # Login, guards (auth, guest, role)
│   │   ├── core/
│   │   │   ├── i18n/           # Internationalisation (FR/EN)
│   │   │   ├── ui/             # Composants UI réutilisables
│   │   │   └── websocket/      # ChatStompService (SockJS + STOMP)
│   │   └── tchat/
│   │       ├── customer/       # Pages client : tchat actif, archivés
│   │       └── agent/          # Pages agent : inbox, tchat, archivés
│   ├── e2e/                    # Tests Playwright (smoke + a11y)
│   ├── public/i18n/            # Fichiers de traduction (fr.json, en.json)
│   └── proxy.conf.json         # Proxy ng serve → API :8080
│
├── context/                    # Documentation WS et API (référence)
│   ├── support_chat_api_endpoints.md
│   ├── support_chat_web_socket_api_spec_clean.md
│   └── ws-protocol.md
│
├── devops/
│   ├── users.json              # Utilisateurs de test (seed)
│   └── seed_users.py           # Script de création des comptes
│
├── misc/cicd/
│   └── run-tests.sh            # Tests API + web (utilisé par GitHub Actions)
│
├── .github/workflows/
│   ├── ci.yml                  # CI : tests + build api/web
│   ├── release.yml             # semantic-release (tags) après CI sur main
│   └── docker-image.yml        # Build/push images api + web vers GHCR
│
├── docker-compose.yml          # Stack complète (postgres + api + web + nginx)
├── docker-compose.prod.yml     # Overlay prod : images API/web depuis GHCR
├── .env.example                # Modèle de variables d'environnement
├── package.json                # Racine : semantic-release uniquement
└── README.md
```

---

## 4. Mise en place de l'environnement

### Étape 1 — Copier le fichier d'environnement

```bash
cp .env.example .env
```

Le fichier `.env` contient toutes les variables nécessaires. Les valeurs par défaut fonctionnent pour le développement local. **Ne jamais committer ce fichier** (il est déjà dans `.gitignore`).

### Variables importantes

| Variable | Description | Valeur par défaut |
|---|---|---|
| `POSTGRES_DB` | Nom de la base de données | `ycyw` |
| `POSTGRES_USER` | Utilisateur PostgreSQL | `ycyw_user` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `changeme` |
| `POSTGRES_PORT` | Port PostgreSQL publié sur l’hôte (Compose) | `5432` |
| `SPRING_DATASOURCE_URL` | URL JDBC utilisée par l’API dans Docker (`postgres` = nom du service) | voir `.env.example` |
| `JWT_SECRET` | Secret de signature des tokens JWT | `changeme_use_a_long_random_string_in_production` |
| `JWT_EXPIRATION_MS` | Durée de vie du token (ms) | `86400000` (24h) |
| `APP_PORT` | Port public unique (hôte → nginx :80 dans le conteneur), comme `conf-samples` | `80` |
| `FRONTEND_ORIGIN` | Origin autorisée (CORS + WebSocket SockJS). Docker Compose définit `http://localhost:${APP_PORT}` | (injecté par Compose) |

Variables optionnelles documentées dans `.env.example` : `SEED_API_BASE_URL`, `API_BASE_URL`, `POSTGRES_HOST` pour le script `seed_users.py`.

> ⚠️ En développement, les valeurs par défaut suffisent. En production, **change obligatoirement** `POSTGRES_PASSWORD` et `JWT_SECRET`.

---

## 5. Lancer le projet

### Option A — Docker Compose (recommandé pour voir la PoC fonctionner)

Lance la stack complète (PostgreSQL + API + frontend statique + **nginx** en entrée, sur le modèle de `conf-samples/`) :

```bash
docker compose up --build
```

**Fichier Compose explicite** (hors du répertoire du dépôt, par exemple) :

```bash
docker compose -f /chemin/vers/poc_app/docker-compose.yml up --build
```

Une fois démarré, tout passe par **`http://localhost:${APP_PORT}`** (défaut **80** → [http://localhost](http://localhost)) :

| Ressource | URL (défaut `APP_PORT=80`) |
|---|---|
| Application (Angular) | http://localhost/ |
| API REST (même origine) | http://localhost/api/… |
| Swagger UI | http://localhost/swagger-ui/index.html |

> Si le port **80** est déjà utilisé, mets par exemple `APP_PORT=4200` dans `.env` et ouvre **http://localhost:4200**.

> Le démarrage prend environ 1–2 minutes la première fois (build Gradle + téléchargement des images Docker). Les fois suivantes, c'est beaucoup plus rapide.

Pour arrêter :

```bash
docker compose down
```

Pour arrêter et supprimer les données (base de données réinitialisée) :

```bash
docker compose down -v
```

---

### Option B — Développement local (API + frontend séparés)

Cette option est plus rapide pour développer car elle évite de rebuilder Docker à chaque changement.

**1. Lance uniquement PostgreSQL dans Docker :**

```bash
docker compose -f ./docker-compose.yml up -d postgres
```

(À la racine du dépôt, `docker compose up -d postgres` suffit : le fichier par défaut est `docker-compose.yml`.) PostgreSQL est accessible sur `localhost` au port `POSTGRES_PORT` (souvent `5432`, déjà publié par `docker-compose.yml`).

**2. Lance l'API Spring Boot :**

```bash
cd api
# Port Postgres : doit correspondre à POSTGRES_PORT du compose (5432 par défaut).
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:${POSTGRES_PORT:-5432}/ycyw ./gradlew bootRun
```

L'API démarre sur http://localhost:8080. Au premier lancement, **Flyway** applique les migrations sous `db/migration` (`ddl-auto: validate` côté Hibernate).

**3. Lance le frontend Angular :**

```bash
cd web
npm install
npm start
```

Le frontend démarre sur http://localhost:4200 avec proxy vers l'API (configuré dans `proxy.conf.json`).

---

### Créer les comptes de test (seed)

Avec la stack Docker (`docker compose up`), l’API n’est pas sur le port 8080 : le script lit **`APP_PORT`** dans le `.env` à la racine du dépôt et appelle **`http://localhost`** (ou `http://localhost:<APP_PORT>`). Les enregistrements passent par nginx comme le navigateur.

```bash
cd devops
uv run seed_users.py
```

Pour **promouvoir les agents** en base, PostgreSQL doit être joignable sur `localhost:${POSTGRES_PORT}` (port publié par la stack). Démarre les conteneurs puis lance le seed — en cas de souci, depuis la racine du dépôt :

```bash
docker compose -f ./docker-compose.yml up -d
cd devops && uv run seed_users.py
```

Les comptes déjà créés renverront `409` et seront ignorés.

Cela crée 6 clients et 2 agents (voir section [Comptes de test](#6-comptes-de-test)).

---

## 6. Comptes de test

### Clients (rôle `CLIENT`)

| Identifiant | Email | Mot de passe |
|---|---|---|
| `alice_johnson` | alice@example.com | `Al!ce2024#` |
| `bob_smith` | bob@example.com | `B0b$mith!7` |
| `carol_white` | carol@example.com | `C@rol#2024` |
| `david_brown` | david@example.com | `D@v1dBr0wn!` |
| `emma_davis` | emma@example.com | `Emma$D4vis!` |
| `frank_miller` | frank@example.com | `Fr@nkM1ll!` |

### Agents de support (rôle `AGENT`)

| Identifiant | Email | Mot de passe |
|---|---|---|
| `grace_support` | grace@support.com | `Gr@ce$upp0rt!` |
| `henry_support` | henry@support.com | `H3nry#Supp0rt!` |

### Scénario de démonstration

Pour démontrer le tchat en temps réel, ouvre **deux onglets** :

1. **Onglet 1** → connecte-toi avec `alice_johnson` → page `/support/chat` → crée un tchat
2. **Onglet 2** → connecte-toi avec `grace_support` → page `/agent` → attache-toi au tchat de Alice
3. Envoie des messages depuis les deux onglets → les messages apparaissent en temps réel

---

## 7. Architecture technique

### Vue d'ensemble

```
┌─────────────────────────────────────────┐
│  Docker : nginx (APP_PORT) → web + api   │
│  Local dev : Angular (4200) + API (8080) │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│           Angular SPA                   │
│  CLIENT view     │     AGENT view        │
│  /support/chat   │     /agent            │
└────────┬─────────┴────────────┬──────────┘
         │  HTTPS / REST        │  WebSocket (STOMP)
         ▼                      ▼
┌─────────────────────────────────────────┐
│         Spring Boot API                 │
│                                          │
│  AuthController    ChatRestController    │
│  JwtFilter         ChatStompController   │
│  ChatService       ChatAccessService     │
└────────────────────┬────────────────────┘
                     │
          ┌──────────▼──────────┐
          │    PostgreSQL 16     │
          │  (Flyway migrations) │
          └─────────────────────┘
```

### Flux de connexion WebSocket

```
Client Angular
  1. POST /auth/login  →  { token: "JWT..." }
  2. Le token JWT est transmis lors du handshake WebSocket (query param ou header selon le transport SockJS)
  3. Subscribe /topic/chat/{chatId}
  4. Subscribe /user/queue/errors
  5. SEND /app/chat.send  →  MESSAGE_CREATED event
```

### Rôles et accès

| Rôle | Accès |
|---|---|
| `CLIENT` | Créer/consulter son tchat actif, voir ses archives |
| `AGENT` | Voir tous les tchats (NEW/ACTIVE/ARCHIVED), s'attacher/détacher, fermer |

---

## 8. Modèle de données

Le schéma est géré par **Flyway** (`api/src/main/resources/db/migration/V1__initial_schema.sql`).

```
┌──────────────────────┐         ┌──────────────────────────┐
│        users         │         │          chats            │
│──────────────────────│         │──────────────────────────│
│ id         UUID PK   │ 1     N │ id         UUID PK        │
│ username   VARCHAR   │─────────│ client_id  UUID FK→users  │
│ email      VARCHAR   │         │ agent_id   UUID FK→users  │
│ password   VARCHAR   │         │ status     VARCHAR        │
│ role       VARCHAR   │         │            NEW|ACTIVE|    │
│ created_at TIMESTAMP │         │            CLOSED         │
│ updated_at TIMESTAMP │         │ created_at TIMESTAMP      │
└──────────────────────┘         │ updated_at TIMESTAMP      │
                                  └────────────┬─────────────┘
                                               │ 1
                                               │ N
                                  ┌────────────▼─────────────┐
                                  │       chat_messages       │
                                  │──────────────────────────│
                                  │ id         UUID PK        │
                                  │ chat_id    UUID FK→chats  │
                                  │ sender_id  UUID FK→users  │
                                  │ content    VARCHAR(1000)  │
                                  │ status     VARCHAR        │
                                  │            ACTIVE|DELETED │
                                  │ edited     BOOLEAN        │
                                  │ created_at TIMESTAMP      │
                                  │ updated_at TIMESTAMP      │
                                  └──────────────────────────┘
```

### Statuts d'un tchat

```
[NEW] ──(agent s'attache)──► [ACTIVE] ──(fermeture)──► [CLOSED]
  ▲                              │
  └──(agent se détache)──────────┘
```

### Index créés

| Index | Table | Colonnes | Utilité |
|---|---|---|---|
| `idx_chats_client_status` | chats | `client_id, status` | Liste des tchats d'un client |
| `idx_chats_status_agent` | chats | `status, agent_id` | Bucket agent (NEW_REQUESTS, MY_ACTIVE) |
| `idx_chats_updated_at` | chats | `updated_at DESC` | Tri chronologique |
| `idx_chat_messages_chat_created` | chat_messages | `chat_id, created_at` | Pagination des messages |

---

## 9. API — référence rapide

### Authentification

| Méthode | Endpoint | Corps | Réponse |
|---|---|---|---|
| `POST` | `/auth/register` | `{ username, email, password }` | `201 Created` — `{ message }` |
| `POST` | `/auth/login` | `{ login, password }` | `{ token: "JWT..." }` |

Le token JWT doit être envoyé dans le header : `Authorization: Bearer <token>`

### REST — Profil utilisateur (`CLIENT` ou `AGENT`)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/user/profile` | Profil du compte connecté |
| `PUT` | `/user/profile` | Mise à jour du profil |

### REST — Tchat client

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/chat/active` | Tchat actif du client (404 si aucun) |
| `POST` | `/api/chat/active` | Créer un tchat avec un premier message |
| `GET` | `/api/chat/archived` | Liste des tchats fermés (paginée) |
| `GET` | `/api/chat/{chatId}/messages` | Messages (`limit` défaut 50 ; `before` / `after` : **UUID du message curseur**, pas des timestamps) |

### REST — Tchat agent

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/agent/chats?bucket=NEW_REQUESTS` | Nouvelles demandes (`page`, `size` disponibles) |
| `GET` | `/api/agent/chats?bucket=MY_ACTIVE` | Mes tchats actifs |
| `GET` | `/api/agent/chats?bucket=OTHERS_ACTIVE` | Tchats des autres agents |
| `GET` | `/api/agent/chats?bucket=ARCHIVED` | Tchats archivés |
| `GET` | `/api/agent/chats/bucket-counts` | Compteurs pour l’onglet inbox |
| `GET` | `/api/agent/chats/{chatId}` | Résumé d’un tchat (agent) |

### WebSocket — Actions STOMP (client → serveur)

| Destination | Action | Corps |
|---|---|---|
| `/app/chat.send` | Envoyer un message | `{ chatId, clientMessageId, content }` |
| `/app/chat.edit` | Modifier un message | `{ chatId, messageId, content }` |
| `/app/chat.delete` | Supprimer un message | `{ chatId, messageId }` |
| `/app/chat.attach` | Agent s'attache au tchat | `{ chatId }` |
| `/app/chat.detach` | Agent se détache | `{ chatId }` |
| `/app/chat.close` | Fermer le tchat | `{ chatId }` |
| `/app/chat.typing` | Indicateur de frappe | `{ chatId }` |

### WebSocket — Événements STOMP (serveur → client)

**Topic `/topic/chat/{chatId}` :**

| Type d'événement | Description |
|---|---|
| `MESSAGE_CREATED` | Nouveau message (inclut l'objet message complet) |
| `MESSAGE_UPDATED` | Message modifié |
| `MESSAGE_DELETED` | Message supprimé |
| `CHAT_STATUS` | Changement de statut (`NEW`, `ACTIVE`, `CLOSED`) |
| `USER_JOINED` / `USER_LEFT` | Présence (agent rejoint/quitte) |
| `TYPING` / `TYPING_STOPPED` | Indicateur de frappe |

**Queue `/user/queue/chats` (agents) :**

| Type | Description |
|---|---|
| `CHAT_LIST_UPDATED` | Signal de rafraîchissement de la liste |

**Queue `/user/queue/errors` :**

| Code | Description |
|---|---|
| `VALIDATION_ERROR` | Données invalides |
| `ACCESS_DENIED` | Accès refusé |
| `CHAT_CLOSED` | Tchat fermé |
| `MESSAGE_NOT_FOUND` | Message introuvable |

> **Documentation complète :** avec Docker (défaut), Swagger UI est sur http://localhost/swagger-ui/index.html. En local sans Docker : http://localhost:8080/swagger-ui/index.html.

---

## 10. Tests

### Backend (Spring Boot)

Depuis le dossier `api/` :

```bash
# Tous les tests (unit + slice + E2E)
./gradlew test

# Tests unitaires et slice uniquement (rapide, sans Docker)
./gradlew test --tests '*' --tests '!com.ycyw.api.tchat.e2e.*'

# Tests E2E uniquement (HTTP + STOMP sur port aléatoire, H2 en mémoire)
./gradlew test --tests 'com.ycyw.api.tchat.e2e.SupportChatE2eTest'
```

> Les tests E2E utilisent H2 en mémoire — **pas besoin de Docker** pour les lancer.

### Tests couverts

| Type | Ce qui est testé |
|---|---|
| Unit | `ChatService`, `ChatAccessService`, `ChatStompInboundAuthorizationService` |
| Slice (repository) | `ChatRepository`, `ChatMessageRepository` |
| Slice (controller) | `ChatRestController`, `AgentChatRestController` |
| E2E | Flux complet HTTP + STOMP : login → création tchat → échange de messages |

### Frontend (Angular)

Depuis le dossier `web/` :

```bash
# Tests unitaires (Vitest)
npm test

# Tests unitaires avec rapport de couverture
npm run test:coverage

# Lint
npm run lint
```

### Tests E2E frontend (Playwright)

> Nécessite que l'application soit lancée (API + frontend).

```bash
cd web

# Lancer tous les tests E2E
npm run test:e2e

# Mode headed (avec navigateur visible)
npm run test:e2e:headed

# Mode UI interactif
npm run test:e2e:ui
```

Les tests E2E vérifient :
- Navigation et guards de routes (login, client, agent)
- Flux de connexion avec identifiants invalides
- Flux client : création tchat, liste des archivés
- Flux agent : inbox, onglets de buckets
- Accessibilité WCAG (axe-core) sur 3 viewports (mobile, tablette, desktop)

---

## 11. UX features

- **Indicateur de frappe** — "X est en train d'écrire..." affiché en temps réel avec debounce côté client (450 ms)
- **Mise à jour temps réel** — les messages apparaissent instantanément sans refresh de page (WebSocket push)
- **Feedback immédiat** — le bouton d'envoi se désactive pendant l'envoi, le compteur de caractères se met à jour en direct
- **ARIA live region** — les nouveaux messages sont annoncés aux lecteurs d'écran (`aria-live="polite"`) pour l'accessibilité
- **Scroll automatique** — le fil de messages défile vers le bas à chaque nouveau message

---

## 12. How to demo

Scénario complet pour démontrer la PoC lors d'une soutenance :

**Prérequis :** application lancée via `docker compose up --build` et comptes créés via `seed_users.py`.

1. **Ouvre deux onglets** dans le navigateur (ou deux navigateurs différents)
2. **Onglet 1** — connecte-toi avec `alice_johnson` / `Al!ce2024#` → tu arrives sur `/support/chat`
3. **Onglet 1** — écris un premier message et clique sur "Démarrer" → le tchat est créé
4. **Onglet 2** — connecte-toi avec `grace_support` / `Gr@ce$upp0rt!` → tu arrives sur `/agent`
5. **Onglet 2** — la demande d'Alice apparaît dans l'onglet "Nouvelles demandes" → clique sur "Prendre en charge"
6. **Les deux onglets** — envoie des messages depuis chaque onglet : ils apparaissent **en temps réel** sans rechargement
7. **Onglet 1** — commence à taper sans envoyer → l'indicateur "Grace est en train d'écrire..." apparaît dans l'onglet 2 (et vice versa)
8. **Onglet 2** — clique sur "Fermer le tchat" → le statut passe à `CLOSED` dans les deux onglets

---

## 13. Limitations (PoC)

Cette PoC démontre la faisabilité technique du tchat. Les points suivants ne sont **pas** dans le périmètre de la PoC et seraient adressés en V2 :

| Limitation | Impact | Solution V2 |
|---|---|---|
| WebSocket limité à une instance | Pas de scaling horizontal sans sticky sessions | Redis Pub/Sub (STOMP broker relay) |
| Pas de garantie de livraison | Message potentiellement perdu si déconnexion | At-least-once delivery, acknowledgements |
| Pas de rate limiting côté WebSocket | Surface d'abus possible | Rate limiting sur le channel STOMP entrant |
| Pas de retry automatique côté client | Message perdu si erreur réseau transitoire | Retry avec backoff exponentiel + idempotency key |
| Refresh token non implémenté | Session expire après 24h sans reconnexion silencieuse | Access token 15 min + refresh token 7 jours |

---

## 14. Décisions techniques

### Pourquoi Spring Boot ?

Spring Boot est retenu pour sa cohérence avec la stack de l'application US existante (la plus performante du parc), et pour Spring Security qui gère JWT et OAuth2 nativement. Spring WebSocket offre un support STOMP intégré sans bibliothèque tierce.

### Pourquoi Angular ?

Angular est le framework de l'application US (existant). L’internationalisation repose sur un **`I18nService` maison** qui charge les JSON depuis `web/public/i18n/` (voir `core/i18n/`) ; ce n’est pas `@angular/localize`. Angular 21 avec composants standalone et signals améliore les performances de détection des changements.

### Pourquoi WebSocket + STOMP plutôt que polling ?

Le polling (requêtes HTTP répétées) génère une charge serveur proportionnelle au nombre de clients connectés. WebSocket + STOMP maintient une connexion persistante bidirectionnelle — moins de requêtes, latence réduite, et meilleure éco-conception.

### Pourquoi PostgreSQL ?

La nature transactionnelle des réservations et des messages exige une base ACID. PostgreSQL offre des UUID natifs (identifiants non-prédictibles), des index composites efficaces, et une compatibilité totale avec Spring Data JPA.

### Pourquoi Flyway ?

Flyway gère le versioning du schéma SQL de façon déterministe. Chaque migration est un fichier versionné (`V1__initial_schema.sql`) qui s'exécute automatiquement au démarrage. En équipe, cela garantit que tous les développeurs ont le même schéma sans configuration manuelle.

### Sécurité JWT

- Le token est signé avec `HMAC-SHA256` et contient l'identifiant utilisateur
- Côté WebSocket, le token est validé lors du handshake SockJS (interceptor + handler custom)
- Les mots de passe sont hashés avec **bcrypt** (Spring Security par défaut)
- Les secrets sont injectés via variables d'environnement — jamais codés en dur
- Protection contre les replay attacks via l'expiration du token JWT (`JWT_EXPIRATION_MS`)

### Structure des modules

Le backend est organisé en modules fonctionnels (`auth`, `tchat`, `user`, `common`) avec séparation stricte des couches (controller → service → repository). Cette structure facilite une future extraction en microservices indépendants si le volume l'exige.

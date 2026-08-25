# École Bilan — gestion financière d'un réseau de 5 écoles

Une application fullstack (Next.js + TypeScript + MongoDB + NextAuth) pour
un promoteur qui possède plusieurs écoles et veut enfin pouvoir vérifier,
en quelques clics, ce que chaque administrateur d'école déclare : combien
d'élèves sont réellement inscrits, combien ont payé, ce qui est sorti en
salaires et en dépenses de fonctionnement — sans dépendre d'un rapport
transmis à la main.

## Ce que couvre l'application

**Entrées (élèves)**
- Chaque école gère la liste de ses élèves (nom, classe, frais mensuel, tuteur).
- **Un vrai grand livre des paiements** : chaque paiement est une transaction
  individuelle et immuable (montant, date, mode de paiement, qui l'a
  enregistré) — jamais une case qu'on écrase. Deux paiements partiels dans
  la même période s'additionnent ; l'historique complet de chaque élève
  reste consultable, période par période.
- Le statut d'un élève pour une période (à jour, partiel, non payé, cas
  social) est **calculé** à partir de la somme réelle des paiements par
  rapport au montant dû — jamais saisi à la main.
- Les cas sociaux et remises sont gérés par un ajustement explicite du
  montant dû pour une période donnée, distinct du paiement lui-même.
- **Un parent peut demander une copie d'un paiement, sans compte.** Un
  formulaire public (`/demande-recu` → `/receipt-request`) permet à un
  parent de demander la copie d'un versement pour son enfant. Un
  administrateur d'école vérifie la demande contre son effectif réel, puis
  envoie le reçu par email en un clic — construit à partir du grand livre
  réel, jamais d'un chiffre saisi à la main. L'administrateur peut aussi
  envoyer un reçu de façon proactive depuis l'historique d'un élève, sans
  attendre de demande.

**Sorties (salaires + dépenses)**
- Le personnel de chaque école (enseignants, administration, personnel
  d'appui) est géré comme avant : départements, employés, champs de paie
  personnalisables, génération de fiches en un clic, envoi par email.
- Les dépenses de fonctionnement (carburant, crédit, rénovation, fournitures,
  charges, entretien, autre) sont enregistrées par école et par période.

**Bilan**
- Pour chaque école : total encaissé − (salaires versés + dépenses) = solde net.
- Vue consolidée sur les 5 écoles pour le promoteur, avec le détail de
  chacune accessible en un clic — exactement la vérification qu'il voulait
  pouvoir faire sans intermédiaire.

## Les 5 rôles

| Rôle | Accès | Ce qu'il voit/fait |
|---|---|---|
| **Super Admin** (nous) | Tout le site | Crée les écoles et les comptes, corrige les données que les écoles fournissent, accès complet partout. |
| **Promoteur** | Toutes les écoles, lecture seule | Tableau de bord consolidé + bilan détaillé de chaque école. Ne modifie rien lui-même. |
| **Administrateur d'école** | Son école uniquement | Ajoute/retire des élèves, enregistre les paiements, ajoute les dépenses, gère le personnel et la paie de son école. |
| **Finance** | Les fiches de paie de son école, lecture seule | Consulte et imprime les fiches de paie déjà générées. Ne peut ni générer ni envoyer. |
| **Enseignant** | Ses propres fiches uniquement | Se connecte et ne voit que l'historique de ses fiches de paie, avec impression. |

Ce modèle correspond à l'option "2 accès pour tout le site (promoteur + nous)
et 5 accès administrateurs pour les 5 écoles" — avec, en plus, la
possibilité de créer soit un compte enseignant individuel par employé, soit
un unique compte finance par école qui peut tout consulter et imprimer. Les
deux options sont démontrées dans les données de départ (voir plus bas).

Chaque page et chaque route API vérifie le rôle et l'école de la personne
connectée — un administrateur d'école ne peut jamais lire ou modifier les
données d'une autre école, même en devinant une URL.

## Création des comptes : pas d'inscription, uniquement des invitations

Il n'existe aucune page d'inscription publique. Le seul chemin pour obtenir
un compte est que le **super admin** en crée un depuis **Comptes** dans le
tableau de bord : nom, email, rôle, et l'école le cas échéant — sans jamais
choisir de mot de passe à sa place.

À la création, un email est envoyé à la personne avec un lien à usage unique
vers `/set-password`, valable 7 jours, où elle choisit elle-même son mot de
passe. Tant qu'elle ne l'a pas fait, le compte reste `pending` et **la
connexion est refusée** — il n'y a pas de mot de passe à deviner puisqu'il
n'y en a simplement pas encore. Si le lien expire ou se perd, le super admin
peut le renvoyer en un clic depuis la page Comptes.

**Mot de passe oublié.** Un compte déjà actif qui perd son mot de passe n'a
pas besoin du super admin : le lien « Mot de passe oublié ? » sur la page de
connexion (`/forgot-password`) envoie un lien de réinitialisation à usage
unique, valable 1 heure, vers `/reset-password`. Cet endpoint ne révèle
jamais si un email correspond à un compte — la réponse est toujours la
même, que l'email existe ou non, pour ne pas exposer qui a un compte sur le
site. Si la personne qui fait la demande a en fait un compte encore
`pending` (jamais activé), le système lui renvoie discrètement son lien
d'invitation à la place — de son point de vue, « j'ai perdu mon mot de
passe » et « j'ai perdu mon invitation » sont le même problème.

Sans configuration SMTP (voir `.env.example`), l'envoi est simulé : l'email
n'est pas réellement délivré, mais l'application se comporte exactement
comme si — pratique pour tester le flux sans dépendre d'un vrai service
d'envoi. Les comptes de démonstration ci-dessous sont une exception
volontaire : ils sont amorcés directement en base avec un mot de passe déjà
actif, pour pouvoir explorer l'application immédiatement sans email à
recevoir.

## Limitation de fréquence (rate limiting)

Tous les points d'entrée accessibles sans compte sont protégés contre les
abus automatisés, via `lib/rateLimit.ts` :

| Endpoint | Limite | Fenêtre |
|---|---|---|
| Connexion (par IP) | 20 tentatives | 15 min |
| Connexion (par email) | 8 tentatives | 15 min |
| Mot de passe oublié (par IP) | 5 demandes | 15 min |
| Mot de passe oublié (par email) | 3 demandes | 15 min |
| Activer/réinitialiser un mot de passe (par IP) | 10 tentatives | 15 min |
| Vérifier un lien d'invitation ou de réinitialisation (par IP) | 30 tentatives | 15 min |
| Demande de reçu par un parent (par IP) | 5 demandes | 1 heure |
| Demande de reçu par un parent (par email) | 5 demandes | 24 heures |

La connexion et « mot de passe oublié » vérifient à la fois l'IP et
l'identifiant (email) séparément — l'un empêche une seule adresse d'être
bombardée depuis plusieurs endroits, l'autre empêche une seule adresse IP
de tester beaucoup de comptes différents.

Le stockage est en mémoire, dans le process Node — le bon niveau
d'ingénierie pour l'échelle de ce projet (une seule instance serveur), mais
avec deux limites à connaître avant de déployer plus grand : les compteurs
sont remis à zéro à chaque redémarrage, et ils ne sont pas partagés entre
plusieurs instances derrière un répartiteur de charge. Le jour où l'un des
deux devient vrai, remplacer `lib/rateLimit.ts` par un store partagé
(Redis ou équivalent) — c'est le seul fichier à toucher, puisque tous les
appelants passent par ses fonctions exportées.

## Validation des adresses email

Chaque email accepté par l'application passe par `lib/validation.ts`, côté
serveur — pas seulement `type="email"` dans le formulaire, qui ne protège
que tant que quelqu'un utilise l'interface prévue. Ça couvre :

- La création d'un compte (`lib/users-data.ts`)
- L'email du tuteur sur une fiche élève, quand renseigné (`addStudent`)
- Une demande de reçu par un parent (`addReceiptRequest`) — obligatoire, vu
  que c'est l'adresse à laquelle le reçu sera envoyé
- L'envoi d'un reçu, qu'il vienne d'une demande formelle ou d'un envoi
  proactif depuis l'historique d'un élève (`sendReceipt`)

La même fonction (`isValidEmail`) est aussi appelée côté client dans les
formulaires correspondants, pour un retour immédiat — mais c'est la
vérification serveur qui compte : rien n'empêche un appel direct à l'API en
contournant l'interface, donc la validation cliente est un confort, jamais
la seule protection. Ce n'est pas un vrai parseur RFC 5322 (rien ne l'est
vraiment sans rejeter au passage des adresses parfaitement valides) — juste
assez strict pour attraper les fautes de frappe évidentes (domaine sans
extension, espace, `@` manquant) avant qu'elles ne deviennent un rebond
silencieux une fois le SMTP réel branché.

## Journal d'audit

Toute la raison d'être de ce système est de permettre au promoteur de
vérifier ce que déclarent les administrateurs d'école plutôt que de leur
faire confiance sur parole — donc supprimer un paiement ou une dépense sans
laisser de trace serait exactement le genre de trou qui rend ça impossible.
Chaque écriture qui compte est maintenant enregistrée dans une collection
`audit_logs` séparée (`lib/audit.ts`), consultable depuis **Journal
d'audit** dans le tableau de bord :

- Paiements et ajustements de frais (ajout **et** annulation — l'annulation
  d'un paiement est l'écriture la plus sensible de toute l'application)
- Dépenses de fonctionnement (ajout et suppression)
- Élèves (ajout et suppression — supprimer un élève entraîne aussi la
  suppression de tout son historique de paiement, donc l'entrée du journal
  note combien de paiements sont partis avec lui)
- Personnel, départements, champs de paie (ajout, modification, suppression)
- Fiches de paie (génération, changement de statut, envoi individuel ou en masse)
- Écoles et comptes (création, modification, suppression, renvoi d'invitation)
- Reçus (envoi proactif ou traitement d'une demande de parent)

Chaque entrée retient qui (nom + rôle), quoi (action + cible), quand, pour
quelle école, et un détail structuré (montant, période, catégorie...) selon
l'action. Rien de sensible aux mots de passe n'y transite jamais.

**Qui voit quoi** suit exactement le modèle de rôles : le super admin et le
promoteur voient le journal de tout le réseau (avec un filtre par école) —
c'est précisément la vérification que le promoteur avait demandée — et
chaque administrateur d'école ne voit que le journal de sa propre école,
forcé côté serveur (`app/api/audit-logs/route.ts`) et non simplement caché
côté interface.

L'écriture d'une entrée ne peut jamais faire échouer l'action qu'elle
décrit : `logAudit()` avale ses propres erreurs plutôt que de les laisser
remonter — dans le pire des cas, une entrée manque au journal, ce qui reste
largement préférable à un paiement qui ne peut pas être annulé parce que la
journalisation a eu un problème.

## Comptes de démonstration

Tous avec le même schéma d'accès que ci-dessus. Mots de passe entre parenthèses.

- **Super Admin** — `admin@ledger.io` (`admin1234`)
- **Promoteur** — `promoteur@groupescolaire.cm` (`promoteur1234`)
- **Admin — Groupe Scolaire Les Cèdres** — `admin.cedres@groupescolaire.cm` (`ecole1234`)
- **Finance — Les Cèdres** — `finance.cedres@groupescolaire.cm` (`finance1234`) — démontre le rôle "finance mutualisée"
- **Admin — Complexe Scolaire La Fontaine** — `admin.fontaine@groupescolaire.cm` (`ecole1234`)
- **Enseignant — La Fontaine** — `enseignant.fontaine@groupescolaire.cm` (`enseignant1234`) — démontre le rôle "accès individuel enseignant"
- **Admin — Institut Bilingue Excellence** — `admin.excellence@groupescolaire.cm` (`ecole1234`)
- **Admin — École Nouvelle Horizon** — `admin.horizon@groupescolaire.cm` (`ecole1234`)
- **Admin — Académie Saint-Michel** (nouvelle école) — `admin.saintmichel@groupescolaire.cm` (`ecole1234`)

La page de connexion affiche ces comptes en un clic pour la démo.

## Stack technique

- **TypeScript** partout — un modèle de données partagé dans `lib/types.ts`.
- **Next.js 14** (App Router), routes API en route handlers.
- **MongoDB** (driver natif) — une collection `schools`, chaque école étant
  un document avec départements, employés, champs de paie, fiches de paie,
  élèves et dépenses intégrés. Une collection `users` pour les comptes.
- **NextAuth** (Credentials), sessions JWT, mots de passe hashés (bcrypt).
- **Autorisation par rôle** à deux niveaux : `middleware.ts` bloque l'accès
  aux pages selon le rôle au niveau de l'edge ; chaque route API revérifie
  via `lib/authz.ts` (défense en profondeur — jamais confiance au seul frontend).
- **Nodemailer** pour l'envoi des fiches de paie — simulé sans SMTP configuré.

## Lancer le projet

```bash
npm install

cp .env.example .env
# éditez .env : MONGODB_URI, NEXTAUTH_SECRET (openssl rand -base64 32), NEXTAUTH_URL

npm run dev
```

Ouvrez **http://localhost:3000**. La première requête qui touche la base
la peuple automatiquement : les 9 comptes ci-dessus et les 5 écoles avec des
élèves, du personnel, des paiements et des dépenses déjà enregistrés.

## Structure du projet

```
lib/
  types.ts            # modèle de données partagé (School, Student, Payment, FeeAdjustment, Role, ...)
  fees.ts               # calcul du grand livre : statut et solde toujours dérivés des paiements réels
  constants.ts             # libellés (statuts, catégories, modes de paiement, rôles)
  mailer.ts                  # emails : fiches de paie, invitations de compte, reçus de paiement
  authz.ts                # règles d'autorisation par rôle (canManageSchool, canReadSchool, ...)
  auth.ts                   # NextAuth (Credentials), la session porte role/schoolId/employeeId
  schools-data.ts             # toute la logique métier : écoles, élèves, dépenses, paie, bilans
  users-data.ts                 # comptes + le flux d'invitation (créer/renvoyer/activer par token)
  audit.ts                        # écrit et lit le journal d'audit (collection audit_logs séparée)
  rateLimit.ts                      # limiteur en mémoire, partagé par tous les points d'entrée publics
  validation.ts                       # validation email, utilisée côté client ET serveur
  seed.ts                                # les 5 écoles + les 9 comptes de démo (déjà actifs, sans invitation)
  apiClient.ts                             # wrapper fetch typé côté client
middleware.ts            # protège chaque route selon le rôle, redirige vers la bonne page d'accueil
app/
  page.tsx                # page publique de présentation
  login/page.tsx            # connexion, avec sélecteur de comptes de démo
  forgot-password/page.tsx    # page publique : demander un lien de réinitialisation
  reset-password/page.tsx       # page publique : choisir un nouveau mot de passe (token à usage unique)
  set-password/page.tsx           # page publique : activer un compte invité (token à usage unique)
  receipt-request/page.tsx          # page publique : un parent demande la copie d'un paiement
  (app)/                       # tout ce qui est derrière l'authentification
    ...
    receipt-requests/page.tsx      # file d'attente des demandes de reçus (admin d'école, super admin)
    audit-log/page.tsx               # qui a fait quoi, quand (super admin, promoteur, admin d'école)
    dashboard/page.tsx           # contenu différent selon le rôle (école / promoteur / finance)
    students/page.tsx              # gestion des élèves + enregistrement des paiements
    expenses/page.tsx                # dépenses de fonctionnement par catégorie
    reports/page.tsx                   # bilan consolidé (promoteur + super admin)
    schools/page.tsx                     # gestion des écoles (super admin)
    users/page.tsx                         # gestion des comptes (super admin)
    my-payslips/page.tsx                     # fiches de paie personnelles (enseignant)
    employees/, departments/, fields/,
    payslips/, send/                           # gestion RH et paie, reprises de la version précédente
```

## Une note sur les tests

Ce projet a été vérifié avec `npx tsc --noEmit` (aucune erreur de type) et
un `next build` complet (compilation, vérification des types, génération de
toutes les pages et des 21 routes API) dans un environnement sans accès à un
serveur MongoDB réel — les appels à la base n'ont donc pas été exécutés
contre une instance réelle ici. Testez avec votre propre MongoDB avant de
vous y fier en production ; si quelque chose ne correspond pas, le plus
probable est dans `lib/schools-data.ts` ou la route qui l'appelle.

## Pistes d'amélioration

- Export PDF des bilans, au-delà de l'impression navigateur actuelle.

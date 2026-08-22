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
- Chaque élève a un statut par période : à jour, partiel, non payé, cas social.
- Le total réellement encaissé se calcule automatiquement à partir des
  paiements enregistrés — pas à partir d'un chiffre déclaré à la main.

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
  types.ts            # modèle de données partagé (School, Student, Expense, Role, ...)
  constants.ts          # libellés (statuts, catégories, rôles)
  authz.ts                # règles d'autorisation par rôle (canManageSchool, canReadSchool, ...)
  auth.ts                   # NextAuth (Credentials), la session porte role/schoolId/employeeId
  schools-data.ts             # toute la logique métier : écoles, élèves, dépenses, paie, bilans
  users-data.ts                 # création/suppression de comptes
  seed.ts                         # les 5 écoles + les 9 comptes de démo
  apiClient.ts                      # wrapper fetch typé côté client
middleware.ts            # protège chaque route selon le rôle, redirige vers la bonne page d'accueil
app/
  page.tsx                # page publique de présentation
  login/page.tsx            # connexion, avec sélecteur de comptes de démo
  (app)/                       # tout ce qui est derrière l'authentification
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

- Traduire entièrement en français les pages Employés/Départements/Champs/
  Fiches de paie (actuellement en anglais, héritées de la version précédente
  du produit — fonctionnelles mais pas encore harmonisées avec le reste).
- Édition des écoles/employés/élèves existants (actuellement : ajout et
  suppression, pas de modification en place).
- Export PDF des bilans, au-delà de l'impression navigateur actuelle.
- Historique/audit des modifications (qui a changé quoi et quand) — utile
  vu le contexte de vérification évoqué par le promoteur.

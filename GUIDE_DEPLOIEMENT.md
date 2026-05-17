# 🚀 ProjectFlow — Guide de déploiement sur GitHub + Vercel
# ============================================================
# Ce guide vous explique pas à pas comment mettre ProjectFlow
# en ligne pour que toute votre équipe puisse y accéder.
# Durée estimée : 20 à 30 minutes
# Niveau requis : aucun, suivez chaque étape dans l'ordre
# ============================================================


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 1 — Créer un compte GitHub
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GitHub est le service où votre code sera stocké.

1. Ouvrez votre navigateur et allez sur : https://github.com
2. Cliquez sur "Sign up" (en haut à droite)
3. Entrez votre adresse e-mail
4. Choisissez un mot de passe
5. Choisissez un nom d'utilisateur (ex: monprenom-projectflow)
6. Cliquez "Continue" jusqu'à la fin
7. Vérifiez votre e-mail et cliquez sur le lien de confirmation

✅ Votre compte GitHub est créé


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 2 — Créer un dépôt GitHub (le "dossier" en ligne)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Une fois connecté sur GitHub, cliquez sur le "+" en haut à droite
2. Sélectionnez "New repository"
3. Remplissez :
   - Repository name : projectflow
   - Description : Mon outil de ticketing (optionnel)
   - Visibilité : choisissez "Public" (obligatoire pour Vercel gratuit)
4. Cochez "Add a README file"
5. Cliquez "Create repository"

✅ Votre dépôt est créé — vous voyez une page avec des fichiers


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 3 — Déposer les fichiers ProjectFlow sur GitHub
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vous avez reçu un dossier "projectflow" avec cette structure :

  projectflow/
  ├── public/
  │   └── index.html
  ├── src/
  │   ├── App.jsx
  │   └── index.js
  ├── .gitignore
  └── package.json

Pour déposer les fichiers sur GitHub :

1. Sur la page de votre dépôt GitHub, cliquez sur "uploading an existing file"
   (vous verrez ce lien en dessous de "Quick setup")

2. Une zone de dépôt apparaît. Faites glisser TOUS les fichiers et dossiers
   du dossier "projectflow" dans cette zone.
   ⚠️ Important : déposez le CONTENU du dossier, pas le dossier lui-même.

3. En bas de la page, dans "Commit changes" :
   - Laissez le message par défaut ou écrivez "Premier dépôt ProjectFlow"
   - Cliquez "Commit changes"

4. Attendez quelques secondes que les fichiers s'envoient

✅ Vos fichiers sont sur GitHub — vous les voyez dans la liste


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 4 — Créer un compte Vercel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vercel est le service qui va mettre votre application en ligne.

1. Allez sur : https://vercel.com
2. Cliquez "Sign Up"
3. Choisissez "Continue with GitHub" ← important, connectez-vous avec GitHub
4. Autorisez Vercel à accéder à votre GitHub
5. Choisissez "Hobby" (gratuit) si on vous demande

✅ Vous êtes connecté à Vercel avec votre compte GitHub


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 5 — Déployer ProjectFlow sur Vercel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Sur le tableau de bord Vercel, cliquez "Add New..." → "Project"

2. Vous voyez la liste de vos dépôts GitHub.
   Trouvez "projectflow" et cliquez "Import"

3. Configuration du projet :
   - Framework Preset : sélectionnez "Create React App"
   - Root Directory : laissez vide
   - Tout le reste : laissez par défaut

4. Cliquez "Deploy"

5. Attendez 1 à 2 minutes (vous voyez une barre de progression)

6. 🎉 Votre application est en ligne !
   Vercel vous donne une URL du type :
   https://projectflow-xxxxx.vercel.app

✅ ProjectFlow est accessible depuis n'importe quel navigateur


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉTAPE 6 — Partager l'URL avec votre équipe
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Copiez l'URL Vercel (ex: https://projectflow-xxxxx.vercel.app)
2. Envoyez-la à vos collaborateurs par e-mail, WhatsApp, Slack...
3. Ils peuvent l'ouvrir sur leur téléphone ou ordinateur, sans aucun compte

Comptes de démonstration disponibles :
  alice@projectflow.io  / alice123
  bruno@projectflow.io  / bruno123
  carla@projectflow.io  / carla123
  david@projectflow.io  / david123

✅ Votre équipe peut maintenant tester ProjectFlow !


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMENT METTRE À JOUR L'APPLICATION APRÈS UNE AMÉLIORATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quand Claude vous génère une nouvelle version des fichiers :

1. Allez sur votre dépôt GitHub (github.com/votre-nom/projectflow)
2. Cliquez sur le fichier à mettre à jour (ex: src/App.jsx)
3. Cliquez sur l'icône crayon ✏️ en haut à droite du fichier
4. Effacez tout le contenu et collez le nouveau code
5. Cliquez "Commit changes"
6. Vercel détecte automatiquement le changement et redéploie en 1-2 minutes

✅ Votre application est mise à jour sans rien faire d'autre !


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EN CAS DE PROBLÈME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si le déploiement échoue sur Vercel :
→ Vérifiez que tous les fichiers sont bien présents sur GitHub
→ Vérifiez que "Create React App" est bien sélectionné comme Framework
→ Revenez voir Claude avec le message d'erreur affiché

Si l'application s'ouvre mais affiche une erreur blanche :
→ Ouvrez les "outils développeur" de votre navigateur (F12)
→ Allez dans l'onglet "Console"
→ Copiez le message d'erreur rouge et donnez-le à Claude

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRAME DE TRAVAIL — Ce qui est prévu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ FAIT
  - Tableau Kanban collaboratif (glisser-déposer)
  - Création / modification / suppression de tickets
  - Priorités, statuts, tags, pièces jointes
  - Assignation à des membres
  - Transfert rapide entre membres
  - Workflow de renvoi (révision, correction, clôture)
  - Historique de chaque ticket
  - Partage par lien et e-mail
  - Alertes à la connexion (nouveaux tickets)
  - Badge "NEW" sur les tickets récents
  - Menu hamburger ☰ avec déconnexion
  - Page Paramètres (structure prête)
  - Page de login avec email + mot de passe
  - Code refactorisé et commenté

📋 À VENIR (prochaines sessions)
  - Page Admin : gestion des membres et des rôles
  - Droits utilisateurs (Admin / Éditeur / Lecteur)
  - Personnalisation des colonnes (couleurs, icônes, noms)
  - Notifications e-mail lors des transferts
  - Rapports et statistiques
  - Espace de travail avec nom + code de sécurité

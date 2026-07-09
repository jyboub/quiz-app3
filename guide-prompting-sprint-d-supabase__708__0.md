# Guide de prompting — Sprint D (connexion Supabase avec Claude)

5 prompts à copier-coller dans l'ordre, un par un. Tester après chaque prompt avant de passer au suivant.

---

## Prompt 1 — Connexion

```
Ajoute la connexion Supabase à mon projet.

URL du projet : https://gysybzdqrmxnxwodcaju.supabase.co
Clé publishable : sb_publishable_kEmDn9lzusPbt03GVp8ZfA_ybdjwlsb

Charge la librairie supabase-js dans index.html, initialise le client dans script.js.
Ajoute un console.log au démarrage qui affiche si le client est bien initialisé.
Ne touche à rien d'autre dans mon code existant.
```

**Test avant de continuer** : ouvrir la console (F12), vérifier qu'il n'y a aucune erreur et que le log de confirmation s'affiche.

---

## Prompt 2 — Insertion (jeu)

```
Voici le schéma de ma table Supabase questions_classeX (remplace X par mon numéro de classe) :
- id (uuid, auto)
- texte (text)
- choix (jsonb, tableau de strings)
- bonne_reponse (text)
- difficulte (text)
- theme (text)
- statut (text)
- contexte (text)
- created_at (timestamptz, auto)

Ajoute une fonction qui insère une question générée dans cette table avec contexte='quiz'.
Le champ theme doit contenir exactement le thème choisi par l'utilisateur dans mon interface (géographie, langue, ou autre selon ce qu'il a sélectionné) — ne mets jamais une valeur fixe en dur, récupère la valeur réellement sélectionnée dans mon code existant.
Utilise cette fonction d'insertion à l'endroit où mon code affiche actuellement une nouvelle question générée par l'IA.
Nettoie la réponse de Claude (retire les balises markdown ```json avant JSON.parse) avant l'insertion.
Ne touche à rien d'autre dans mon code existant.
```

**Test avant de continuer** : générer une question avec un thème choisi (ex. "langue"), vérifier dans le Table Editor Supabase que la ligne insérée a bien `theme='langue'` — pas une valeur générique ou vide. Refaire le test avec un autre thème pour confirmer que la colonne suit vraiment la sélection.

---

## Prompt 3 — Lecture (jeu)

```
Ajoute une fonction qui lit les questions dans questions_classeX (même table qu'avant) en filtrant sur contexte='quiz' ET sur le thème actuellement choisi par l'utilisateur (même variable que celle utilisée pour l'insertion au prompt précédent).
Le thème est choisi une seule fois au lancement du quiz et reste fixe jusqu'à la fin de la session — ne prévois aucun changement de thème en cours de partie, aucun sélecteur de thème pendant que le quiz est en cours.
Utilise cette fonction pour alimenter l'affichage des questions à la place de l'appel direct à l'IA, si une question disponible dans ce thème existe déjà en base.
Ne touche à rien d'autre dans mon code existant.
```

**Test avant de continuer** : sur un poste, choisir le thème "géographie" et générer une question. Sur un deuxième poste, choisir aussi "géographie" et recharger : la même question doit apparaître sans nouvel appel API (regarder l'onglet Network). Puis choisir "langue" sur le deuxième poste : une question différente doit être générée, pas celle de géographie. Vérifier aussi qu'aucun sélecteur de thème n'apparaît une fois le quiz commencé.

---

## Prompt 4 — Fonction de test manuelle

```
Ajoute une fonction genererEtEnregistrerPourTest(theme, nombre) appelable uniquement depuis la console du navigateur.
Elle doit générer "nombre" questions sur le thème donné et les insérer dans questions_classeX avec contexte='test' (jamais 'quiz').
Elle doit retourner un tableau que je peux afficher avec console.table().
Ne touche à rien d'autre dans mon code existant.
```

**Test avant de continuer** : dans la console (F12), lancer `genererEtEnregistrerPourTest("geographie", 10).then(console.table)`, vérifier 10 nouvelles lignes en base avec `contexte='test'`, et vérifier que le jeu affiché à l'écran ne change pas (donc que le filtre du prompt 3 fonctionne).

---

## Prompt 5 — Vérification de non-régression

```
Relis l'ensemble de mon script.js. Vérifie que :
- Le scoring et la progression (question X/Y) du Sprint B fonctionnent toujours
- Aucune erreur ne remonte dans la console au chargement normal du jeu
- La fonction de test (contexte='test') n'est appelée nulle part automatiquement

Signale-moi tout point suspect sans rien modifier.
```

**Test avant de continuer** : lire la réponse de Claude, corriger manuellement ou par prompt ciblé si un point est signalé.

---

## Si ça plante quand même

Colle l'erreur exacte de la console + le message renvoyé par Supabase (souvent visible dans l'onglet Network, requête en rouge) directement dans le prompt suivant. Ne reformule pas l'erreur de mémoire.

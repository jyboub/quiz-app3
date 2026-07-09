# Connexion à Supabase — ce qu'il faut savoir

Ce document explique comment connecter votre appli quiz à la base de données partagée Supabase. À utiliser à partir du **Sprint D** (stockage partagé multi-utilisateurs).

---

## 1. Vos identifiants de connexion

Ces deux valeurs sont **identiques pour les 3 classes** — seul le nom de la table change.

| Paramètre | Valeur |
|---|---|
| **Project URL** | `https://gysybzdqrmxnxwodcaju.supabase.co` |
| **Clé publishable** | `sb_publishable_kEmDn9lzusPbt03GVp8ZfA_ybdjwlsb` |

> Cette clé est publique par nature (elle est faite pour être exposée côté navigateur) — vous pouvez la coller sans risque dans votre `script.js`. Ce n'est pas la même logique que la clé API Claude, qui elle reste secrète côté proxy.

## 2. Votre table

| Classe | Nom de la table |
|---|---|
| Classe 1 | `questions_classe1` |
| Classe 2 | `questions_classe2` |
| Classe 3 | `questions_classe3` |

**Vérifiez bien que vous utilisez le nom de table correspondant à votre classe.** Une erreur ici fait écrire ou lire les questions dans la mauvaise classe.

## 3. Colonnes disponibles

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Généré automatiquement, ne pas fournir |
| `texte` | text | L'énoncé de la question |
| `choix` | jsonb | Tableau des réponses possibles, ex. `["Paris", "Lyon", "Marseille"]` |
| `bonne_reponse` | text | La réponse correcte (doit être présente dans `choix`) |
| `difficulte` | text | Ex. `facile`, `moyen`, `difficile` |
| `theme` | text | Le thème de la question |
| `statut` | text | `en_attente` / `validée` / `rejetée` (utilisé à partir du Sprint F) |
| `contexte` | text | `quiz` (production) ou `test` (voir sections 6 et 7) |
| `created_at` | timestamptz | Généré automatiquement, ne pas fournir |

## 4. Le schéma à donner à Claude

**Claude ne connaît pas votre base de données** — si vous lui demandez du code sans lui donner la structure exacte, il va deviner des noms de colonnes plausibles mais faux, et vous obtiendrez une erreur du type `Could not find the 'X' column`.

**Avant de demander du code de connexion à Claude, collez-lui systématiquement ce bloc dans votre prompt** (adaptez le X au numéro de votre classe) :

```
Table : questions_classeX
Colonnes :
- id (uuid, généré automatiquement — ne pas fournir à l'insertion)
- texte (text)
- choix (jsonb, tableau de strings, ex. ["Paris", "Lyon", "Marseille"])
- bonne_reponse (text, doit être une valeur présente dans choix)
- difficulte (text, ex. facile / moyen / difficile)
- theme (text)
- statut (text : en_attente / validée / rejetée — utilisé à partir du Sprint F)
- contexte (text : quiz ou test — quiz pour le jeu réel, test pour vos vérifications manuelles)
- created_at (timestamptz, généré automatiquement — ne pas fournir)
```

Ce même bloc sert de référence si Claude génère un comportement inattendu en cours de sprint — recollez-le pour recadrer une réponse qui invente une colonne.

## 5. Mise en place technique

**Étape 1 — Charger la librairie Supabase**

Dans votre `index.html`, ajoutez cette ligne **avant** votre `script.js` :

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

**Étape 2 — Initialiser le client**

En haut de votre `script.js` :

```javascript
const SUPABASE_URL = "https://gysybzdqrmxnxwodcaju.supabase.co";
const SUPABASE_KEY = "sb_publishable_kEmDn9lzusPbt03GVp8ZfA_ybdjwlsb";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
```

**Étape 3 — Insérer une question (flux quiz normal)**

```javascript
const { data, error } = await supabase
  .from('questions_classeX') // remplacez X par le numéro de votre classe
  .insert({
    texte: "Quelle est la capitale de la France ?",
    choix: ["Paris", "Lyon", "Marseille"],
    bonne_reponse: "Paris",
    difficulte: "facile",
    theme: "geographie",
    contexte: "quiz"
  });

if (error) console.error("Erreur insertion :", error);
```

**Étape 4 — Lire les questions (flux quiz normal)**

À partir du Sprint F, filtrez aussi sur `statut='validée'` pour ne récupérer que les questions validées par le créateur :

```javascript
const { data, error } = await supabase
  .from('questions_classeX')
  .select('*')
  .eq('contexte', 'quiz');
  // à partir du Sprint F, ajoutez : .eq('statut', 'validée')

if (error) console.error("Erreur lecture :", error);
```

## 6. Pourquoi la colonne `contexte` existe

**Une seule table contient deux types de lignes mélangées.** Il n'y a pas une table pour le jeu et une autre pour les tests — `questions_classe1` (ou 2, ou 3) contient à la fois :

- des lignes `contexte: "quiz"` → générées par le jeu réellement joué par les utilisateurs
- des lignes `contexte: "test"` → générées manuellement par un stagiaire, depuis la console du navigateur (F12), pour vérifier un invariant ou analyser un échantillon (Sprint D et E)

Sans filtre, ces deux mondes se mélangent : si un stagiaire lance un test d'invariant sur 10 générations pendant que d'autres jouent au quiz, ces 10 questions de test (potentiellement mal formées, c'est le but du test) apparaîtraient dans le jeu de tout le monde.

**La règle absolue : toute lecture faite par le jeu doit filtrer `.eq('contexte', 'quiz')`.** C'est ce filtre — pas un hasard de nommage — qui empêche vos tests de polluer ce que voient les utilisateurs.

Exemple d'appel de test depuis la console (Sprint D, vérification d'invariant sur 10 générations) :

```javascript
genererEtEnregistrerPourTest("geographie", 10).then(console.table)
```

Cette fonction insère avec `contexte: "test"` — elle n'est jamais appelée automatiquement par le jeu, uniquement à la main par vous.

## 7. Quand l'appli rappelle-t-elle l'API Claude ?

Ce n'est **pas** "tant qu'il y a des questions en base" — c'est **"tant qu'il n'y a pas assez de questions `contexte='quiz'` pour faire tourner le quiz"**. Deux mécanismes bien distincts, à ne pas confondre :

| Mécanisme | Qui le déclenche | Condition |
|---|---|---|
| Génération automatique au chargement (Sprint D) | Un joueur qui charge la page | Se déclenche seulement si le `SELECT` filtré sur `contexte='quiz'` ne remonte pas assez de questions |
| Bouton "Ajouter 5 questions" (Sprint F, `admin.html`) | Le créateur, manuellement | Toujours 5 appels API au clic, sans vérifier combien de questions existent déjà |
| `genererEtEnregistrerPourTest(...)` (Sprint D/E, console F12) | Un stagiaire, manuellement | Toujours exécuté, insère en `contexte='test'` |

Concrètement, pour le premier cas : dès qu'assez de questions `quiz` existent en base, un nouveau joueur qui charge la page **lit directement Supabase et ne déclenche plus d'appel API** — c'est ce qui permet à tous les postes de la classe de voir les mêmes questions sans regénérer à chaque fois.

## 8. Erreurs fréquentes

| Erreur | Cause probable |
|---|---|
| `new row violates row-level security policy` | Ne devrait pas arriver (les policies sont ouvertes), mais si ça arrive : vérifiez que vous utilisez bien la clé publishable, pas une autre clé |
| `Could not find the 'X' column` | Faute de frappe dans le nom d'une colonne, ou colonne appelée avant sa création (voir séquencement des sprints) |
| Rien ne s'affiche mais pas d'erreur | Vérifiez que `contexte` correspond bien entre l'insertion et le filtre de lecture (`quiz` vs `test`) |
| Des questions bizarres/incohérentes apparaissent dans le quiz | Le filtre `.eq('contexte', 'quiz')` manque dans la lecture — des lignes de test (`contexte='test'`) remontent aussi |
| Question visible alors qu'elle est `en_attente` | Le filtre `.eq('statut', 'validée')` manque dans la lecture (à partir du Sprint F) |

---

*Pensez à toujours vérifier la console du navigateur (F12) en cas de comportement inattendu — les erreurs Supabase y apparaissent explicitement.*

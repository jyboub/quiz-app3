// Configuration de la génération par IA (proxy Vercel : relaie vers l'API Anthropic)
const API_URL = "https://quiz-proxy3.vercel.app/api/ask-claude";
const QUIZ_THEME = "la certification ISTQB CT-AI v2 (Certified Tester AI Testing)";
const QUESTION_COUNT = 5;

// Le proxy Vercel est plafonné à 10 s (maxDuration). Générer 5 questions d'un
// seul appel dépasse ce délai → 504. On découpe donc en plusieurs petits lots
// appelés en parallèle, chacun bien en dessous de la limite.
const BATCH_SIZE = 2;

// Consigne envoyée à l'IA : impose un JSON strict, en français, sur le thème voulu.
// La variation (angle) évite d'obtenir les mêmes questions d'un lot à l'autre.
function buildPrompt(count, variation) {
  return `Génère ${count} question(s) de quiz à choix multiple, en français, sur ${QUIZ_THEME}.
${variation}
Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour ni balises markdown.
Chaque élément a exactement cette forme :
{"question": "...", "choices": ["...", "...", "...", "..."], "answerIndex": 0}
Contraintes : 4 choix par question, une seule bonne réponse, "answerIndex" est l'index (0 à 3) de la bonne réponse.`;
}

// Les questions sont désormais générées par l'IA au chargement.
let quizData = [];

const questionEl = document.getElementById("question");
const choicesEl = document.getElementById("choices");
const feedbackEl = document.getElementById("feedback");
const progressEl = document.getElementById("progress");
const scoreEl = document.getElementById("score");

let currentIndex = 0;
let score = 0;

// Chargement progressif : les questions arrivent lot par lot en arrière-plan.
let totalQuestions = QUESTION_COUNT; // total visé (ajusté à la fin si besoin)
let loadingDone = false; // true quand tous les lots sont revenus
let pendingNext = false; // true si l'utilisateur attend une question pas encore arrivée

// Met à jour l'indicateur de progression et le score affiché
function renderStatus() {
  progressEl.textContent = `Question ${currentIndex + 1}/${totalQuestions}`;
  scoreEl.textContent = `Score : ${score}`;
}

// La question courante est-elle la dernière ? (connu seulement une fois le chargement fini)
function isLastQuestion() {
  return loadingDone && currentIndex >= quizData.length - 1;
}

// Affiche la question courante et ses choix
function renderQuestion() {
  const current = quizData[currentIndex];

  renderStatus();
  questionEl.textContent = current.question;
  choicesEl.innerHTML = "";
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  current.choices.forEach((choice, index) => {
    const li = document.createElement("li");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.textContent = choice;
    button.addEventListener("click", () => handleAnswer(index, button));

    li.appendChild(button);
    choicesEl.appendChild(li);
  });
}

// Gère le clic sur un choix, met à jour le score et enchaîne la suite
function handleAnswer(index, button) {
  const current = quizData[currentIndex];
  const isCorrect = index === current.answerIndex;
  const buttons = choicesEl.querySelectorAll(".choice");

  buttons.forEach((btn) => {
    btn.disabled = true;
  });

  if (isCorrect) {
    // Le score ne s'incrémente que sur une bonne réponse
    score += 1;
    button.classList.add("choice--correct");
    feedbackEl.textContent = "Correct !";
    feedbackEl.className = "feedback feedback--correct";
  } else {
    button.classList.add("choice--incorrect");
    buttons[current.answerIndex].classList.add("choice--correct");
    feedbackEl.textContent = "Incorrect";
    feedbackEl.className = "feedback feedback--incorrect";
  }

  renderStatus();

  // Après avoir répondu, l'utilisateur passe à la suite via le bouton « Suivant »
  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "next";
  nextButton.textContent = isLastQuestion() ? "Voir le résultat" : "Question suivante";
  nextButton.addEventListener("click", goNext);

  const li = document.createElement("li");
  li.appendChild(nextButton);
  choicesEl.appendChild(li);
  nextButton.focus();
}

// Passe à la question suivante, au résultat, ou attend qu'un lot arrive
function goNext() {
  if (isLastQuestion()) {
    renderResult();
    return;
  }

  const next = currentIndex + 1;
  if (next < quizData.length) {
    // La question suivante est déjà chargée
    currentIndex = next;
    renderQuestion();
  } else {
    // Pas encore reçue du proxy : on affiche une attente brève, reprise par onBatch()
    pendingNext = true;
    renderWaitingNext();
  }
}

// Choisit un message adapté au score final (en pourcentage de réussite)
function getResultMessage(score, total) {
  const ratio = total > 0 ? score / total : 0;

  if (ratio === 1) {
    return `Parfait ! Un sans-faute : ${score}/${total}. Vous maîtrisez ISTQB CT-AI. 🏆`;
  }
  if (ratio >= 0.8) {
    return `Excellent ! ${score}/${total}. Vous êtes presque au point. 🎯`;
  }
  if (ratio >= 0.5) {
    return `Pas mal ! ${score}/${total}. Encore quelques révisions et ce sera parfait. 👍`;
  }
  if (ratio > 0) {
    return `Score : ${score}/${total}. Un peu de révision sur ISTQB CT-AI s'impose. 📚`;
  }
  return `Score : ${score}/${total}. Pas de panique, recommencez pour progresser ! 💪`;
}

// Affiche l'écran de fin avec le score final
function renderResult() {
  progressEl.textContent = "Quiz terminé";
  scoreEl.textContent = `Score final : ${score}/${quizData.length}`;

  questionEl.textContent = getResultMessage(score, quizData.length);
  choicesEl.innerHTML = "";
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  const li = document.createElement("li");
  const restartButton = document.createElement("button");
  restartButton.type = "button";
  restartButton.className = "choice";
  restartButton.textContent = "Recommencer";
  restartButton.addEventListener("click", restartQuiz);
  li.appendChild(restartButton);
  choicesEl.appendChild(li);
}

// Réinitialise le quiz depuis le début (régénère un nouveau lot via l'IA)
function restartQuiz() {
  currentIndex = 0;
  score = 0;
  init();
}

// --- Génération par IA ---------------------------------------------------

// Affiche un état de chargement pendant l'appel au proxy IA
function renderLoading() {
  progressEl.textContent = "";
  scoreEl.textContent = "";
  questionEl.textContent = "Génération des questions par l'IA…";
  choicesEl.innerHTML = "";
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
}

// Affiche un message d'erreur clair avec possibilité de réessayer
function renderError(message) {
  progressEl.textContent = "";
  scoreEl.textContent = "";
  questionEl.textContent = message;
  choicesEl.innerHTML = "";
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback feedback--incorrect";

  const li = document.createElement("li");
  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.className = "choice";
  retryButton.textContent = "Réessayer";
  retryButton.addEventListener("click", init);
  li.appendChild(retryButton);
  choicesEl.appendChild(li);
}

// Extrait un tableau de questions depuis une réponse IA de forme variable.
// Le proxy peut renvoyer directement le JSON, ou l'encapsuler (ex : Claude
// renvoie { content: [{ text }] }), parfois entouré de balises ```json.
function extractQuestions(payload) {
  // 1. Trouver la charge utile textuelle ou l'objet déjà parsé
  let data = payload;

  if (data && typeof data === "object") {
    if (typeof data.content === "string") data = data.content;
    else if (Array.isArray(data.content) && data.content[0]?.text) data = data.content[0].text;
    else if (typeof data.completion === "string") data = data.completion;
    else if (typeof data.text === "string") data = data.text;
  }

  // 2. Si c'est une chaîne, retirer d'éventuelles balises markdown puis parser
  if (typeof data === "string") {
    const cleaned = data.replace(/```(?:json)?/gi, "").trim();
    data = JSON.parse(cleaned);
  }

  // 3. Accepter soit un tableau direct, soit { questions: [...] }
  const list = Array.isArray(data) ? data : data?.questions;
  if (!Array.isArray(list)) {
    throw new Error("Format inattendu : tableau de questions introuvable.");
  }
  return list;
}

// Valide et normalise une question ; renvoie null si elle est inexploitable.
function normalizeQuestion(raw) {
  if (!raw || typeof raw !== "object") return null;

  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  const choices = Array.isArray(raw.choices) ? raw.choices.map((c) => String(c)) : [];
  const answerIndex = Number(raw.answerIndex);

  const valid =
    question.length > 0 &&
    choices.length >= 2 &&
    Number.isInteger(answerIndex) &&
    answerIndex >= 0 &&
    answerIndex < choices.length;

  return valid ? { question, choices, answerIndex } : null;
}

// Appelle le proxy IA pour UN lot et renvoie ses questions valides
async function fetchBatch(count, variation) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: buildPrompt(count, variation) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Le service a répondu avec une erreur (${response.status}).`);
  }

  const payload = await response.json();
  return extractQuestions(payload).map(normalizeQuestion).filter(Boolean);
}

// Lance la génération par lots parallèles et appelle onBatch() dès que chacun
// arrive — sans attendre les autres. Le 1er lot est volontairement petit pour
// afficher une question le plus vite possible. Renvoie une promesse résolue
// quand tous les lots sont terminés.
function startFetching(onBatch) {
  // Angles variés pour limiter les doublons entre lots
  const angles = [
    "Concentre-toi sur les concepts fondamentaux et le vocabulaire.",
    "Concentre-toi sur les types de tests et les techniques spécifiques à l'IA.",
    "Concentre-toi sur les risques, les biais et la qualité des données.",
  ];

  // Tailles de lots : 1 d'abord (affichage quasi immédiat), puis le reste par BATCH_SIZE
  const sizes = [1];
  let remaining = QUESTION_COUNT - 1;
  while (remaining > 0) {
    const n = Math.min(BATCH_SIZE, remaining);
    sizes.push(n);
    remaining -= n;
  }

  const jobs = sizes.map((count, i) =>
    fetchBatch(count, angles[i % angles.length])
      .then((questions) => onBatch(questions))
      .catch((error) => {
        console.warn(`Lot ${i + 1} en échec :`, error.message);
      })
  );

  return Promise.allSettled(jobs);
}

// Affiche une brève attente quand l'utilisateur demande une question pas encore reçue
function renderWaitingNext() {
  questionEl.textContent = "Chargement de la question suivante…";
  choicesEl.innerHTML = "";
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
}

// Point d'entrée : démarre le quiz dès la 1re question, charge le reste en fond
async function init() {
  renderLoading();

  quizData = [];
  currentIndex = 0;
  score = 0;
  totalQuestions = QUESTION_COUNT;
  loadingDone = false;
  pendingNext = false;

  // Reçoit un lot : ajoute ses questions et débloque l'affichage si nécessaire
  const onBatch = (questions) => {
    if (!questions || questions.length === 0) return;

    const wasEmpty = quizData.length === 0;
    quizData.push(...questions.slice(0, QUESTION_COUNT - quizData.length));

    if (wasEmpty) {
      // Première question disponible → on démarre immédiatement
      renderQuestion();
    } else if (pendingNext && currentIndex + 1 < quizData.length) {
      // L'utilisateur attendait la suite → on la lui montre
      pendingNext = false;
      currentIndex += 1;
      renderQuestion();
    }
  };

  await startFetching(onBatch);

  // Chargement terminé : on cale le total réel et on rafraîchit l'affichage
  loadingDone = true;

  if (quizData.length === 0) {
    renderError(
      "Impossible de générer les questions pour le moment. Vérifiez votre connexion, puis réessayez."
    );
    return;
  }

  totalQuestions = quizData.length;

  if (pendingNext) {
    // L'utilisateur attend encore alors que tout est chargé : plus rien à venir
    pendingNext = false;
    if (currentIndex + 1 < quizData.length) {
      currentIndex += 1;
      renderQuestion();
    } else {
      renderResult();
    }
  } else {
    // Rafraîchit l'indicateur « X/total » et l'éventuel bouton de fin
    renderStatus();
  }
}

init();

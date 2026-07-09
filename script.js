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

// Délai (ms) avant de passer automatiquement à la question suivante
const NEXT_DELAY = 1200;

// Met à jour l'indicateur de progression et le score affiché
function renderStatus() {
  progressEl.textContent = `Question ${currentIndex + 1}/${quizData.length}`;
  scoreEl.textContent = `Score : ${score}`;
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

  const isLastQuestion = currentIndex === quizData.length - 1;
  setTimeout(() => {
    if (isLastQuestion) {
      renderResult();
    } else {
      currentIndex += 1;
      renderQuestion();
    }
  }, NEXT_DELAY);
}

// Affiche l'écran de fin avec le score final
function renderResult() {
  progressEl.textContent = "Quiz terminé";
  scoreEl.textContent = `Score final : ${score}/${quizData.length}`;

  questionEl.textContent = `Bravo ! Vous avez obtenu ${score} sur ${quizData.length}.`;
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

// Découpe la génération en petits lots parallèles (contourne le timeout 10 s
// du proxy) puis agrège les questions valides jusqu'à QUESTION_COUNT.
async function fetchQuestions() {
  // Angles variés pour limiter les doublons entre lots
  const angles = [
    "Concentre-toi sur les concepts fondamentaux et le vocabulaire.",
    "Concentre-toi sur les types de tests et les techniques spécifiques à l'IA.",
    "Concentre-toi sur les risques, les biais et la qualité des données.",
  ];

  const batches = [];
  for (let i = 0; i * BATCH_SIZE < QUESTION_COUNT; i++) {
    const count = Math.min(BATCH_SIZE, QUESTION_COUNT - i * BATCH_SIZE);
    batches.push(fetchBatch(count, angles[i % angles.length]));
  }

  // Un lot en échec ne doit pas condamner tout le quiz : on garde ce qui a réussi
  const results = await Promise.allSettled(batches);
  const questions = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .slice(0, QUESTION_COUNT);

  if (questions.length === 0) {
    throw new Error("Aucune question exploitable n'a été générée.");
  }
  return questions;
}

// Point d'entrée : génère les questions via l'IA puis démarre le quiz
async function init() {
  renderLoading();
  try {
    quizData = await fetchQuestions();
    currentIndex = 0;
    score = 0;
    renderQuestion();
  } catch (error) {
    console.error("Échec de la génération des questions :", error);
    renderError(
      "Impossible de générer les questions pour le moment. Vérifiez votre connexion, puis réessayez."
    );
  }
}

init();

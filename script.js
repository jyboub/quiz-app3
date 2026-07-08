// Liste des questions du quiz — thème : certification ISTQB CT-AI v2
// (Certified Tester AI Testing — Testeur certifié pour l'intelligence artificielle)
const quizData = [
  {
    question:
      "Dans le contexte ISTQB CT-AI, que désigne le « biais algorithmique » (algorithmic bias) ?",
    choices: [
      "Une préférence systématique du modèle produisant des résultats injustes envers certains groupes",
      "Une erreur de syntaxe dans le code d'entraînement",
      "Un ralentissement du temps de réponse du modèle",
      "Une panne matérielle du serveur d'inférence",
    ],
    answerIndex: 0,
  },
  {
    question:
      "Quel critère de qualité, spécifique aux systèmes d'IA, décrit la capacité à expliquer comment une décision a été prise ?",
    choices: ["La portabilité", "L'explicabilité (explainability)", "La compatibilité", "La modularité"],
    answerIndex: 1,
  },
  {
    question:
      "Le « problème de l'oracle de test » est particulièrement marqué pour les systèmes d'IA car :",
    choices: [
      "Les tests sont toujours plus rapides à exécuter",
      "Le résultat attendu exact est souvent difficile, voire impossible, à déterminer",
      "L'IA ne produit jamais deux fois le même résultat, ce qui simplifie la comparaison",
      "Les systèmes d'IA n'ont pas besoin de données de test",
    ],
    answerIndex: 1,
  },
  {
    question:
      "Que vise une attaque « adversariale » (adversarial attack) sur un modèle de machine learning ?",
    choices: [
      "Améliorer la précision du modèle en production",
      "Réduire la taille du jeu de données d'entraînement",
      "Tromper le modèle avec des entrées légèrement modifiées pour provoquer une mauvaise prédiction",
      "Accélérer la phase d'entraînement",
    ],
    answerIndex: 2,
  },
  {
    question:
      "Le « concept drift » (dérive du concept) désigne :",
    choices: [
      "Une évolution des relations entre les données dans le temps, dégradant les performances du modèle",
      "Une erreur d'arrondi lors du calcul des poids",
      "Le déplacement physique du serveur d'hébergement",
      "Un changement de langage de programmation du projet",
    ],
    answerIndex: 0,
  },
];

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

// Réinitialise le quiz depuis le début
function restartQuiz() {
  currentIndex = 0;
  score = 0;
  renderQuestion();
}

renderQuestion();

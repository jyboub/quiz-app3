// Liste des questions du quiz
const quizData = [
  {
    question: "Quel langage s'exécute nativement dans le navigateur ?",
    choices: ["Python", "JavaScript", "C++", "Java"],
    answerIndex: 1,
  },
  {
    question: "Que signifie HTML ?",
    choices: [
      "HyperText Markup Language",
      "HighText Machine Language",
      "Hyperlink and Text Markup Language",
      "Home Tool Markup Language",
    ],
    answerIndex: 0,
  },
  {
    question: "Quelle balise CSS permet de changer la couleur du texte ?",
    choices: ["font-size", "background", "color", "text-align"],
    answerIndex: 2,
  },
  {
    question: "Quel symbole utilise-t-on pour un commentaire sur une ligne en JavaScript ?",
    choices: ["<!-- -->", "//", "/* */", "#"],
    answerIndex: 1,
  },
  {
    question: "Quelle méthode ajoute un élément à la fin d'un tableau JavaScript ?",
    choices: ["push()", "pop()", "shift()", "concat()"],
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

function checkAnswer(reponse) {
  const feedback = document.getElementById('feedback');
  if (reponse === 'Paris') {
    feedback.textContent = "✅ Correct !";
  } else {
    feedback.textContent = "❌ Incorrect, réessaie.";
  }
}
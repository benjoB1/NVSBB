let currentQuestionIndex = 0;
let score = 0;
let triviaQuestions = [];

document.addEventListener("DOMContentLoaded", function () {
    fetchTriviaQuestions();
    document.getElementById("nextButton").addEventListener("click", nextQuestion);
    document.getElementById("getJokeButton").addEventListener("click", getJoke);
});

// Fetch trivia questions from Open Trivia Database API
function fetchTriviaQuestions() {
    fetch("https://opentdb.com/api.php?amount=5&type=multiple")
        .then(response => response.json())
        .then(data => {
            triviaQuestions = data.results.map(q => ({
                ...q,
                question: decodeHTML(q.question),
                correct_answer: decodeHTML(q.correct_answer),
                incorrect_answers: q.incorrect_answers.map(decodeHTML)
            }));
            displayQuestion();
        })
        .catch(error => {
            console.error('Error fetching trivia questions:', error);
            document.getElementById("question").textContent = "Fehler beim Laden der Fragen. Bitte versuche es erneut.";
        });
}

// Display the current question and options
function displayQuestion() {
    const question = triviaQuestions[currentQuestionIndex];
    document.getElementById("question").innerHTML = question.question;

    const options = [...question.incorrect_answers, question.correct_answer];
    shuffleArray(options);

    const optionsContainer = document.getElementById("options");
    optionsContainer.innerHTML = '';
    options.forEach(option => {
        const button = document.createElement("button");
        button.classList.add("btn", "btn-outline-primary");
        button.innerHTML = option;
        button.addEventListener("click", () => checkAnswer(option));
        optionsContainer.appendChild(button);
    });

    document.getElementById("nextButton").style.display = "none";
}

// Check if the selected answer is correct and show feedback
function checkAnswer(selectedAnswer) {
    const correctAnswer = triviaQuestions[currentQuestionIndex].correct_answer;
    console.log('Selected Answer:', selectedAnswer);
    console.log('Correct Answer:', correctAnswer);

    document.querySelectorAll("#options button").forEach(button => {
        const buttonText = decodeHTML(button.innerHTML); // Decode button text for comparison
        button.disabled = true;
        button.classList.remove("btn-outline-primary"); // Remove default style
        if (buttonText === correctAnswer) {
            button.classList.add("btn-success");
            console.log('Marking as correct:', buttonText);
        } else if (buttonText === selectedAnswer && selectedAnswer !== correctAnswer) {
            button.classList.add("btn-danger");
            console.log('Marking as incorrect:', buttonText);
        }
    });

    if (selectedAnswer === correctAnswer) {
        score++;
        console.log('Score incremented. Current score:', score);
    }

    document.getElementById("nextButton").style.display = "block";
}

// Move to the next question
function nextQuestion() {
    currentQuestionIndex++;

    if (currentQuestionIndex < triviaQuestions.length) {
        displayQuestion();
    } else {
        endQuiz();
    }
}

// End the quiz and show results
function endQuiz() {
    document.getElementById("quiz-container").style.display = "none";
    const resultContainer = document.getElementById("result-container");
    resultContainer.classList.remove("d-none");
    resultContainer.innerHTML = `
        <h3>Quiz beendet!</h3>
        <p>Dein Ergebnis: ${score} von ${triviaQuestions.length} richtig</p>
        <button id="getJokeButton" class="btn btn-success">Hol dir einen Witz!</button>
    `;
    document.getElementById("getJokeButton").addEventListener("click", getJoke);
}

// Fetch a random joke using JokeAPI
function getJoke() {
    fetch("https://v2.jokeapi.dev/joke/Programming?type=single")
        .then(response => response.json())
        .then(data => {
            const jokeText = decodeHTML(data.joke) || "Kein Witz verfügbar!";
            document.getElementById("joke-text").textContent = jokeText;
            document.getElementById("joke-output").classList.remove("d-none");
        })
        .catch(error => {
            console.error('Error fetching joke:', error);
            document.getElementById("joke-text").textContent = "Fehler beim Laden des Witzes.";
            document.getElementById("joke-output").classList.remove("d-none");
        });
}

// Utility function to shuffle options
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Utility function to decode HTML entities
function decodeHTML(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}
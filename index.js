class MathDuel {
    constructor() {
        // Spielzustandsvariablen
        this.score = 0;
        this.opponentScore = 0;
        this.timeLeft = 30;
        this.currentAnswer = 0;
        this.timerInterval = null;
        this.opponentInterval = null;
        this.isPaused = false;
        
        // Spielerstatistiken
        this.stats = {
            gamesPlayed: 0,
            totalScore: 0,
            bestScore: parseInt(localStorage.getItem("bestScore")) || 0
        };
        
        this.selectedTheme = null;
        this.selectedOpponent = null;
        
        // Gegner-Konfiguration mit verschiedenen Schwierigkeitsgraden
        this.opponents = {
            easy: { 
                name: "Bauer", 
                difficulty: 0.3, 
                description: "Ein einfacher Bauer vom Land.", 
                icon: "bi-tree" 
            },
            medium: { 
                name: "Schüler", 
                difficulty: 0.6, 
                description: "Ein fleißiger Mathe-Schüler.", 
                icon: "bi-book" 
            },
            hard: { 
                name: "Albert Einstein", 
                difficulty: 0.9, 
                description: "Der Genie-Mathematiker!", 
                icon: "bi-lightbulb" 
            }
        };
        
        this.init();
    }
    
    // Initialisiert das Spiel und lädt gespeicherte Daten
    init() {
        this.loadStats();
        this.updateRecordDisplay();
        this.setupThemeSelection();
        this.setupOpponentSelection();
        this.setupEventListeners();
    }
    
    // Lädt gespeicherte Statistiken aus localStorage
    loadStats() {
        const savedStats = localStorage.getItem("mathDuelStats");
        if (savedStats) {
            this.stats = JSON.parse(savedStats);
        }
    }
    
    // Speichert aktuelle Statistiken in localStorage
    saveStats() {
        localStorage.setItem("mathDuelStats", JSON.stringify(this.stats));
    }
    
    // Setzt Event-Listener für Hauptaktionen
    setupEventListeners() {
        document.getElementById("startButton").addEventListener("click", () => this.startGame());
        document.getElementById("pauseButton")?.addEventListener("click", () => this.togglePause());
    }
    
    // Konfiguriert die Themenauswahl-Buttons
    setupThemeSelection() {
        const themeButtons = document.querySelectorAll(".theme-btn");
        const opponentSelection = document.getElementById("opponentSelection");
        themeButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                this.selectedTheme = btn.getAttribute("data-theme");
                themeButtons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                opponentSelection.classList.remove("hidden");
            });
        });
    }
    
    // Konfiguriert die Gegnerauswahl-Buttons
    setupOpponentSelection() {
        const opponentButtons = document.querySelectorAll(".opponent-btn");
        const startButton = document.getElementById("startButton");
        opponentButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                this.selectedOpponent = btn.getAttribute("data-difficulty");
                opponentButtons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                startButton.classList.remove("hidden");
            });
        });
    }
    
    // Startet ein neues Spiel
    startGame() {
        if (!this.validateSelection()) return;
        
        this.resetGame();
        this.updateScoreboard();
        this.toggleUIElements(true);
        this.showOpponentProfile();
        this.generateQuestion();
        
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        this.opponentInterval = setInterval(() => this.opponentMove(), 3000);
        this.stats.gamesPlayed++;
    }
    
    // Überprüft, ob Theme und Gegner ausgewählt wurden
    validateSelection() {
        if (!this.selectedTheme || !this.selectedOpponent) {
            this.showAlert("Bitte wähle ein Thema und einen Gegner aus!", "warning");
            return false;
        }
        return true;
    }
    
    // Setzt das Spiel zurück
    resetGame() {
        this.score = 0;
        this.opponentScore = 0;
        this.timeLeft = 30;
        this.isPaused = false;
        clearInterval(this.timerInterval);
        clearInterval(this.opponentInterval);
    }
    
    // Zeigt das Gegnerprofil an
    showOpponentProfile() {
        const opponent = this.opponents[this.selectedOpponent];
        document.getElementById("opponentProfile").innerHTML = 
            `<i class="bi ${opponent.icon} me-2"></i>${opponent.name}: ${opponent.description}`;
    }
    
    // Generiert eine neue Frage basierend auf dem gewählten Thema
    generateQuestion() {
        const maxNum = this.selectedOpponent === "hard" ? 20 : 10;
        const num1 = Math.floor(Math.random() * maxNum) + 1;
        const num2 = Math.floor(Math.random() * maxNum) + 1;
        
        this.currentAnswer = this.calculateAnswer(num1, num2);
        document.getElementById("question").textContent = 
            `${num1} ${this.getOperator()} ${num2} = ?`;
        this.generateOptions();
    }
    
    // Berechnet die richtige Antwort basierend auf dem Thema
    calculateAnswer(num1, num2) {
        switch (this.selectedTheme) {
            case "addition": return num1 + num2;
            case "subtraction": return num1 - num2;
            case "multiplication": return num1 * num2;
            case "mixed": 
                const operators = ["+", "-", "*"];
                const op = operators[Math.floor(Math.random() * 3)];
                return op === "+" ? num1 + num2 : 
                       op === "-" ? num1 - num2 : num1 * num2;
        }
    }
    
    // Gibt den aktuellen Operator zurück
    getOperator() {
        const operators = { addition: "+", subtraction: "-", multiplication: "*", mixed: ["+", "-", "*"] };
        return this.selectedTheme === "mixed" ? 
            operators.mixed[Math.floor(Math.random() * 3)] : 
            operators[this.selectedTheme];
    }
    
    // Generiert Antwortmöglichkeiten
    generateOptions() {
        const optionsContainer = document.getElementById("options");
        optionsContainer.innerHTML = "";
        const answers = new Set([this.currentAnswer]);
        
        while (answers.size < 4) {
            const randomNum = this.currentAnswer + Math.floor(Math.random() * 10) - 5;
            if (randomNum !== this.currentAnswer) answers.add(randomNum);
        }
        
        const shuffledAnswers = Array.from(answers).sort(() => Math.random() - 0.5);
        shuffledAnswers.forEach(answer => {
            const btn = document.createElement("button");
            btn.textContent = answer;
            btn.classList.add("btn", "btn-outline-primary", "fw-bold", "option-btn");
            btn.addEventListener("click", () => this.checkAnswer(answer));
            optionsContainer.appendChild(btn);
        });
    }
    
    // Überprüft die ausgewählte Antwort
    checkAnswer(selectedAnswer) {
        if (this.isPaused) return;
        
        const feedback = document.getElementById("feedback");
        feedback.classList.remove("d-none", "alert-success", "alert-danger");
        
        const isCorrect = selectedAnswer === this.currentAnswer;
        this.score += isCorrect ? 1 : 0;
        this.stats.totalScore += isCorrect ? 1 : 0;
        
        feedback.textContent = isCorrect ? "Richtig!" : `Falsch! Richtig wäre: ${this.currentAnswer}`;
        feedback.classList.add(isCorrect ? "alert-success" : "alert-danger");
        
        this.updateScoreboard();
        setTimeout(() => feedback.classList.add("d-none"), 1000);
        this.generateQuestion();
    }
    
    // Simuliert den Zug des Gegners
    opponentMove() {
        if (this.isPaused) return;
        
        const opponent = this.opponents[this.selectedOpponent];
        if (Math.random() < opponent.difficulty) this.opponentScore++;
        this.updateScoreboard();
    }
    
    // Aktualisiert den Timer
    updateTimer() {
        if (this.isPaused) return;
        
        this.timeLeft--;
        document.getElementById("timer").innerHTML = 
            `<i class="bi bi-clock me-2"></i>Zeit: ${this.timeLeft}`;
        if (this.timeLeft <= 0) this.endGame();
    }
    
    // Beendet das Spiel und zeigt Ergebnisse
    endGame() {
        clearInterval(this.timerInterval);
        clearInterval(this.opponentInterval);
        this.toggleUIElements(false);
        
        this.updateBestScore();
        this.saveStats();
        
        const opponentName = this.opponents[this.selectedOpponent].name;
        const message = this.generateEndMessage(opponentName);
        this.showAlert(message, "info");
    }
    
    // Aktualisiert den besten Score wenn nötig
    updateBestScore() {
        if (this.score > this.stats.bestScore) {
            this.stats.bestScore = this.score;
            localStorage.setItem("bestScore", this.stats.bestScore);
            this.updateRecordDisplay();
        }
    }
    
    // Generiert die Endnachricht
    generateEndMessage(opponentName) {
        return this.score > this.stats.bestScore ?
            `Neuer Rekord! Dein Score: ${this.score} | ${opponentName}: ${this.opponentScore}\n` +
            `Spiele gespielt: ${this.stats.gamesPlayed}` :
            `Spiel vorbei! Dein Score: ${this.score} | ${opponentName}: ${this.opponentScore}\n` +
            `Spiele gespielt: ${this.stats.gamesPlayed}`;
    }
    
    // Aktualisiert die Anzeige des besten Scores
    updateRecordDisplay() {
        document.getElementById("record").innerHTML = 
            `<i class="bi bi-trophy me-2"></i>Bester Score: ${this.stats.bestScore}`;
    }
    
    // Aktualisiert das Scoreboard
    updateScoreboard() {
        const opponentName = this.opponents[this.selectedOpponent].name;
        document.getElementById("score").textContent = 
            `Dein Score: ${this.score} | ${opponentName} Score: ${this.opponentScore}`;
    }
    
    // Schaltet zwischen Pause und Fortsetzen
    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseButton = document.getElementById("pauseButton");
        if (pauseButton) {
            pauseButton.textContent = this.isPaused ? "Fortsetzen" : "Pause";
        }
        this.showAlert(this.isPaused ? "Spiel pausiert" : "Spiel fortgesetzt", "info");
    }
    
    // Schaltet UI-Elemente um
    toggleUIElements(isGameStart) {
        document.getElementById("themeSelection").classList.toggle("hidden", isGameStart);
        document.getElementById("opponentSelection").classList.toggle("hidden", isGameStart);
        document.getElementById("startButton").classList.toggle("hidden", isGameStart);
        document.getElementById("gameArea").classList.toggle("hidden", !isGameStart);
    }
    
    // Zeigt eine Alert-Nachricht an
    showAlert(message, type) {
        const feedback = document.getElementById("feedback");
        feedback.classList.remove("d-none", "alert-success", "alert-danger", "alert-info", "alert-warning");
        feedback.classList.add(`alert-${type}`);
        feedback.textContent = message;
        setTimeout(() => feedback.classList.add("d-none"), 2000);
    }
}

new MathDuel();
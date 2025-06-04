class Workout {
    constructor(type) {
        this.type = type;  // Typ des Workouts (z.B. Joggen, Radfahren)
        this.stepCount = 0;
        this.caloriesBurned = 0;
        this.distanceCovered = 0; // In Metern
        this.stepLength = 0.8; // Durchschnittliche Schrittlänge in Metern
        this.elapsedTime = 0; // Zeit in Sekunden
        this.lastTime = 0; // Zeitstempel der letzten Bewegung
        this.timer = null; // Timer Referenz
        this.isPaused = false;
        this.history = []; // Workout Verlauf
    }

    // Methode zum Zählen von Schritten basierend auf der Beschleunigung
    handleDeviceMotion(event) {
        let accX = event.acceleration.x;
        let accY = event.acceleration.y;
        let accZ = event.acceleration.z;

        // Berechne die Gesamtbeschleunigung
        let totalAcceleration = Math.sqrt(accX * accX + accY * accY + accZ * accZ);

        if (totalAcceleration > 2) {
            let currentTime = new Date().getTime();

            // Verhindern, dass Schritte zu schnell gezählt werden (Schwellenwert Zeit)
            if (currentTime - this.lastTime > 500) { // Zeit zwischen zwei Schritten mindestens 500ms
                this.stepCount++;
                this.distanceCovered = this.stepCount * this.stepLength; // Berechne zurückgelegte Distanz
                this.caloriesBurned = this.calculateCalories(); // Kalorien je nach Workout
                this.lastTime = currentTime;
                this.updateHistory();
                return { stepCount: this.stepCount, caloriesBurned: this.caloriesBurned, distanceCovered: this.distanceCovered };
            }
        }
    }

    // Methode zur Berechnung der Kalorien basierend auf dem Workout-Typ
    calculateCalories() {
        const calorieFactors = {
            jogging: 0.07,
            cycling: 0.05,
            strength: 0.06,
            swimming: 0.08,
            yoga: 0.03,
            hiit: 0.1
        };
        return this.stepCount * (calorieFactors[this.type] || 0);
    }

    // Methode zum Starten des Timers
    startTimer() {
        this.elapsedTime = 0;
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.updateTimer(), 1000);
    }

    // Methode zur Aktualisierung der verstrichenen Zeit
    updateTimer() {
        if (!this.isPaused) {
            this.elapsedTime++;
            let minutes = Math.floor(this.elapsedTime / 60);
            let seconds = this.elapsedTime % 60;
            this.updateTimerDisplay(minutes, seconds);
        }
    }

    // Methode zur Anzeige des Timers
    updateTimerDisplay(minutes, seconds) {
        const workoutTimerDisplay = document.getElementById('workout-timer');
        workoutTimerDisplay.innerText = `Verstrichene Zeit: ${this.formatTime(minutes)}:${this.formatTime(seconds)}`;
    }

    // Methode zum Formatieren der Zeit
    formatTime(time) {
        return time < 10 ? `0${time}` : time;
    }

    // Methode zur Pause des Workouts
    pauseWorkout() {
        this.isPaused = !this.isPaused;
        const status = this.isPaused ? "Workout pausiert" : "Workout fortgesetzt";
        return status;
    }

    // Methode zum Stoppen des Workouts
    stopWorkout() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isPaused = false;
        this.updateHistory();
        return "Workout beendet";
    }

    // Methode zur Aktualisierung des Verlaufes
    updateHistory() {
        this.history.push({
            date: new Date().toLocaleString(),
            workoutType: this.type,
            steps: this.stepCount,
            calories: this.caloriesBurned.toFixed(2),
            distance: this.distanceCovered.toFixed(2),
            duration: this.elapsedTime
        });
        if (this.history.length > 5) this.history.shift(); // Behalte nur die letzten 5 Workouts
    }

    // Methode zur Anzeige des Verlaufs
    displayHistory() {
        const historyList = document.getElementById('workout-history');
        historyList.innerHTML = '';
        this.history.forEach(entry => {
            const li = document.createElement('li');
            li.innerText = `${entry.date}: ${entry.workoutType} - ${entry.steps} Schritte, ${entry.calories} kcal, ${entry.distance} m, ${Math.floor(entry.duration / 60)}:${this.formatTime(entry.duration % 60)}`;
            historyList.appendChild(li);
        });
    }
}

// Instanziierung eines Workouts
let currentWorkout = new Workout('jogging');

// Event Listener für das Starten des Workouts
document.getElementById('start-workout').addEventListener('click', function () {
    currentWorkout.startTimer();
    alert(`Workout gestartet: ${currentWorkout.type}`);
    // Buttons aktivieren
    document.getElementById('pause-workout').disabled = false;
    document.getElementById('stop-workout').disabled = false;
    document.getElementById('start-workout').disabled = true;
});

// Event Listener für das Pausieren des Workouts
document.getElementById('pause-workout').addEventListener('click', function () {
    const status = currentWorkout.pauseWorkout();
    alert(status);
});

// Event Listener für das Stoppen des Workouts
document.getElementById('stop-workout').addEventListener('click', function () {
    const status = currentWorkout.stopWorkout();
    alert(status);
    currentWorkout.displayHistory(); // Zeige den Verlauf an
    // Buttons deaktivieren
    document.getElementById('pause-workout').disabled = true;
    document.getElementById('stop-workout').disabled = true;
    document.getElementById('start-workout').disabled = false;
});

// Event Listener für die Auswahl des Workouts
document.getElementById('workout-select').addEventListener('change', function () {
    currentWorkout.type = this.value;
    currentWorkout.caloriesBurned = currentWorkout.calculateCalories();
    currentWorkout.displayHistory();
});

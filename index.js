/**
 * Klasse zur Verwaltung eines Fitness-Trackers, der Schritte, Kalorien, Distanz, Standort,
 * Workouts und Benachrichtigungen verfolgt.
 */
class FitnessTracker {
    /**
     * Konstruktor: Initialisiert Variablen und DOM-Elemente.
     */
    constructor() {
        // Zustandsvariablen
        this.stepCount = 0; // Anzahl der Schritte
        this.caloriesBurned = 0; // Verbrannte Kalorien
        this.distanceCovered = 0; // Zurückgelegte Distanz in Metern
        this.lastTime = 0; // Zeitstempel der letzten Bewegung
        this.stepLength = 0.8; // Durchschnittliche Schrittlänge in Metern
        this.workoutType = 'jogging'; // Standard-Workout-Typ
        this.workoutTimer = null; // Timer für Workout-Dauer
        this.elapsedTime = 0; // Verstrichene Zeit in Sekunden
        this.isPaused = false; // Pause-Status des Workouts
        this.stepHistory = []; // Verlauf der Schritte für Diagramm
        this.reminderInterval = null; // Interval für Benachrichtigungsprüfung
        this.maxHistoryPoints = 50; // Maximale Datenpunkte im Diagramm

        // DOM-Elemente
        this.stepDisplay = document.getElementById('step-count');
        this.caloriesDisplay = document.getElementById('calories-burned');
        this.distanceDisplay = document.getElementById('distance-covered');
        this.locationDisplay = document.getElementById('location-info');
        this.workoutSelect = document.getElementById('workout-select');
        this.workoutTimerDisplay = document.getElementById('workout-timer');
        this.notificationTimeInput = document.getElementById('notification-time');
        this.dailyReminderCheckbox = document.getElementById('daily-reminder');
        this.startButton = document.getElementById('start-workout');
        this.pauseButton = document.getElementById('pause-workout');
        this.stopButton = document.getElementById('stop-workout');
        this.historyList = document.getElementById('workout-history');

        // Chart.js Setup für Schrittverlauf
        this.stepsChart = new Chart(document.getElementById('steps-chart').getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Schritte',
                    data: [],
                    borderColor: '#4CAF50',
                    fill: false,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    /**
     * Initialisiert den Fitness-Tracker: Lädt gespeicherte Daten, richtet Event-Listener ein
     * und prüft Geräteunterstützung.
     */
    initialize() {
        console.log('Fitness-Tracker wird initialisiert.');
        // Prüfen, ob alle DOM-Elemente vorhanden sind
        if (!this.startButton || !this.pauseButton || !this.stopButton || !this.workoutTimerDisplay) {
            this.showError('Fehler: Workout-Steuerungselemente nicht gefunden.');
            return;
        }

        // Prüfen, ob Device Motion unterstützt wird
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', (event) => this.handleDeviceMotion(event));
        } else {
            console.log("Device Motion wird nicht unterstützt.");
            this.showError("Dieses Gerät unterstützt keine Bewegungsdaten.");
        }

        // Event-Listener für Workout-Auswahl
        this.workoutSelect.addEventListener('change', () => {
            this.workoutType = this.workoutSelect.value;
            this.caloriesBurned = this.calculateCalories();
            this.updateDisplays();
        });

        // Standort, Benachrichtigungen und Workout-Steuerung einrichten
        this.getCurrentLocation();
        this.setupPushNotifications();
        this.setupWorkoutControls();
        this.loadProgress();
        this.updateHistory();
    }

    /**
     * Verarbeitet Bewegungsdaten des Geräts, um Schritte zu zählen.
     * @param {DeviceMotionEvent} event - Das Bewegungsereignis
     */
    handleDeviceMotion(event) {
        if (this.isPaused) return;

        // Beschleunigungswerte oder 0, falls nicht verfügbar
        const accX = event.acceleration.x || 0;
        const accY = event.acceleration.y || 0;
        const accZ = event.acceleration.z || 0;

        // Gesamtbeschleunigung berechnen
        const totalAcceleration = Math.sqrt(accX * accX + accY * accY + accZ * accZ);

        // Schritt zählen, wenn Beschleunigung über Schwellenwert und Zeitintervall passt
        if (totalAcceleration > 2) {
            const currentTime = new Date().getTime();
            if (currentTime - this.lastTime > 500) {
                this.stepCount++;
                this.distanceCovered = this.stepCount * this.stepLength;
                this.caloriesBurned = this.calculateCalories();
                this.lastTime = currentTime;

                this.updateChart();
                this.saveProgress();
                this.updateDisplays();
            }
        }
    }

    /**
     * Berechnet verbrannte Kalorien basierend auf dem Workout-Typ.
     * @returns {number} Verbrannte Kalorien
     */
    calculateCalories() {
        const calorieFactors = {
            jogging: 0.07,
            cycling: 0.05,
            strength: 0.06,
            swimming: 0.08,
            yoga: 0.03,
            hiit: 0.1
        };
        return this.stepCount * (calorieFactors[this.workoutType] || 0);
    }

    /**
     * Ruft den aktuellen Standort des Benutzers ab.
     */
    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    this.getAddressFromCoordinates(lat, lon);
                },
                (error) => {
                    console.log("Standortfehler: ", error);
                    this.locationDisplay.innerText = "Standort nicht verfügbar";
                    this.showError("Standort konnte nicht abgerufen werden.");
                }
            );
        } else {
            console.log("Geolocation wird nicht unterstützt.");
            this.showError("Geolocation wird auf diesem Gerät nicht unterstützt.");
        }
    }

    /**
     * Wandelt Koordinaten in eine Adresse um (Reverse Geocoding).
     * @param {number} lat - Breitengrad
     * @param {number} lon - Längengrad
     */
    getAddressFromCoordinates(lat, lon) {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.address) {
                    const street = data.address.road || 'Unbekannt';
                    const city = data.address.city || 'Unbekannt';
                    this.locationDisplay.innerText = `${street}, ${city}`;
                } else {
                    this.locationDisplay.innerText = "Adresse nicht gefunden";
                }
            })
            .catch(error => {
                console.log("Reverse-Geocoding Fehler: ", error);
                this.locationDisplay.innerText = "Fehler bei der Standortbestimmung";
                this.showError("Adresse konnte nicht geladen werden.");
            });
    }

    /**
     * Aktualisiert die Anzeige von Schritten, Kalorien und Distanz.
     */
    updateDisplays() {
        this.stepDisplay.innerText = `Schritte: ${this.stepCount}`;
        this.caloriesDisplay.innerText = `Kalorien: ${this.caloriesBurned.toFixed(2)} kcal`;
        this.distanceDisplay.innerText = `Distanz: ${this.distanceCovered.toFixed(2)} m`;
    }

    /**
     * Richtet Event-Listener für Benachrichtigungen ein.
     */
    setupPushNotifications() {
        const setReminderButton = document.getElementById('set-reminder');
        if (!setReminderButton) {
            this.showError('Fehler: Reminder-Button nicht gefunden.');
            return;
        }
        setReminderButton.addEventListener('click', () => {
            if (!this.notificationTimeInput.value) {
                this.showError("Bitte eine gültige Zeit auswählen.");
                return;
            }
            if (this.reminderInterval) {
                clearInterval(this.reminderInterval);
                console.log("Vorheriger Reminder-Interval gelöscht");
            }
            this.setReminder(this.notificationTimeInput.value, this.dailyReminderCheckbox.checked);
        });
    }

    /**
     * Setzt eine Erinnerung zur angegebenen Zeit mit optional täglicher Wiederholung.
     * @param {string} time - Zeit im Format "HH:MM"
     * @param {boolean} isDaily - Ob die Erinnerung täglich wiederholt werden soll
     */
    setReminder(time, isDaily) {
        const [reminderHour, reminderMinute] = time.split(":").map(Number);

        // Funktion zum Überprüfen und Auslösen der Erinnerung
        const checkReminder = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            console.log(`Aktuelle Zeit: ${currentHour}:${currentMinute}, Zielzeit: ${reminderHour}:${reminderMinute}`);

            // Prüfen, ob die aktuelle Zeit mit der Zielzeit übereinstimmt
            if (currentHour === reminderHour && currentMinute === reminderMinute) {
                // In-Page-Benachrichtigung
                this.showInPageReminder(`Zeit für dein ${this.workoutType} Workout!`);
                // Browser-Alert
                alert(`Zeit für dein ${this.workoutType} Workout!`);
                console.log("Alert-Benachrichtigung ausgelöst");
                // Native Benachrichtigung, falls erlaubt
                if (Notification.permission === "granted") {
                    new Notification("Zeit für dein Workout!", {
                        body: `Dein ${this.workoutType} Workout wartet!`,
                        icon: './icon.png' // Optional: Icon für Benachrichtigung
                    });
                    console.log("Native Benachrichtigung ausgelöst");
                }
                // Interval beenden, wenn nicht täglich
                if (!isDaily) {
                    clearInterval(this.reminderInterval);
                    console.log("Einmalige Erinnerung abgeschlossen");
                }
            }
        };

        // Zielzeit für die erste Erinnerung setzen
        const targetTime = new Date();
        targetTime.setHours(reminderHour, reminderMinute, 0, 0);
        if (targetTime < new Date()) {
            targetTime.setDate(targetTime.getDate() + 1);
        }

        console.log(`Erinnerung geplant für: ${targetTime.toLocaleString()}`);
        this.showSuccess(`Erinnerung gesetzt für ${targetTime.toLocaleTimeString()}${isDaily ? ' (täglich)' : ''}`);

        // Interval starten, um jede Minute zu prüfen
        this.reminderInterval = setInterval(checkReminder, 60000);
        // Sofort prüfen, falls die Zeit bereits erreicht ist
        checkReminder();
    }

    /**
     * Zeigt eine In-Page-Benachrichtigung an.
     * @param {string} message - Die anzuzeigende Nachricht
     */
    showInPageReminder(message) {
        const reminderDiv = document.createElement('div');
        reminderDiv.className = 'alert alert-reminder';
        reminderDiv.innerText = message;
        document.body.appendChild(reminderDiv);
        setTimeout(() => reminderDiv.remove(), 5000);
    }

    /**
     * Richtet Event-Listener für Workout-Steuerung ein.
     */
    setupWorkoutControls() {
        // Prüfen, ob Buttons vorhanden sind
        if (!this.startButton || !this.pauseButton || !this.stopButton) {
            this.showError('Fehler: Workout-Buttons nicht gefunden.');
            console.error('Workout-Buttons fehlen:', {
                startButton: this.startButton,
                pauseButton: this.pauseButton,
                stopButton: this.stopButton
            });
            return;
        }

        // Event-Listener mit korrektem this-Kontext
        this.startButton.addEventListener('click', this.startWorkout.bind(this));
        this.pauseButton.addEventListener('click', this.togglePauseWorkout.bind(this));
        this.stopButton.addEventListener('click', this.stopWorkout.bind(this));

        console.log('Workout-Steuerung eingerichtet');
    }

    /**
     * Startet ein neues Workout und den Timer.
     */
    startWorkout() {
        if (this.workoutTimer) {
            console.log('Workout bereits aktiv');
            this.showError('Workout läuft bereits.');
            return;
        }
        console.log(`Starte Workout: ${this.workoutType}`);
        this.showSuccess(`Workout gestartet: ${this.workoutType}`);
        this.startTimer();
        this.startButton.disabled = true;
        this.pauseButton.disabled = false;
        this.stopButton.disabled = false;
    }

    /**
     * Pausiert oder setzt das Workout fort.
     */
    togglePauseWorkout() {
        this.isPaused = !this.isPaused;
        this.pauseButton.innerText = this.isPaused ? "Fortsetzen" : "Pausieren";
        console.log(`Workout ${this.isPaused ? 'pausiert' : 'fortgesetzt'}`);
        this.showSuccess(this.isPaused ? "Workout pausiert" : "Workout fortgesetzt");
    }

    /**
     * Beendet das Workout und speichert den Verlauf.
     */
    stopWorkout() {
        if (this.workoutTimer) {
            clearInterval(this.workoutTimer);
            this.workoutTimer = null;
            console.log('Workout-Timer gestoppt');
        }
        this.isPaused = false;
        this.pauseButton.innerText = "Pausieren";
        this.startButton.disabled = false;
        this.pauseButton.disabled = true;
        this.stopButton.disabled = true;
        this.saveWorkoutHistory();
        console.log('Workout beendet');
        this.showSuccess("Workout beendet");
    }

    /**
     * Startet den Timer für die Workout-Dauer.
     */
    startTimer() {
        this.elapsedTime = 0;
        if (this.workoutTimer) {
            clearInterval(this.workoutTimer);
            console.log('Vorheriger Workout-Timer gelöscht');
        }
        this.workoutTimer = setInterval(() => {
            if (!this.isPaused) {
                this.elapsedTime++;
                const minutes = Math.floor(this.elapsedTime / 60);
                const seconds = this.elapsedTime % 60;
                this.workoutTimerDisplay.innerText = `Verstrichene Zeit: ${this.formatTime(minutes)}:${this.formatTime(seconds)}`;
                console.log(`Timer aktualisiert: ${minutes}:${seconds}`);
            }
        }, 1000);
    }

    /**
     * Formatiert Zeitwerte mit führender Null.
     * @param {number} time - Zeitwert (Minuten oder Sekunden)
     * @returns {string} Formatierte Zeit
     */
    formatTime(time) {
        return time < 10 ? `0${time}` : time;
    }

    /**
     * Speichert den aktuellen Fortschritt im localStorage.
     */
    saveProgress() {
        localStorage.setItem('stepCount', this.stepCount);
        localStorage.setItem('caloriesBurned', this.caloriesBurned);
        localStorage.setItem('distanceCovered', this.distanceCovered);
    }

    /**
     * Lädt gespeicherten Fortschritt aus dem localStorage.
     */
    loadProgress() {
        if (localStorage.getItem('stepCount')) {
            this.stepCount = parseInt(localStorage.getItem('stepCount')) || 0;
            this.caloriesBurned = parseFloat(localStorage.getItem('caloriesBurned')) || 0;
            this.distanceCovered = parseFloat(localStorage.getItem('distanceCovered')) || 0;
            this.updateDisplays();
            this.updateChart();
        }
    }

    /**
     * Speichert den Workout-Verlauf im localStorage.
     */
    saveWorkoutHistory() {
        const history = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
        history.push({
            date: new Date().toLocaleString(),
            workoutType: this.workoutType,
            steps: this.stepCount,
            calories: this.caloriesBurned.toFixed(2),
            distance: this.distanceCovered.toFixed(2),
            duration: this.elapsedTime
        });
        localStorage.setItem('workoutHistory', JSON.stringify(history));
        this.updateHistory();
    }

    /**
     * Aktualisiert die Anzeige des Workout-Verlaufs.
     */
    updateHistory() {
        const history = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
        this.historyList.innerHTML = '';
        history.slice(-5).forEach(entry => {
            const li = document.createElement('li');
            li.innerText = `${entry.date}: ${entry.workoutType} - ${entry.steps} Schritte, ${entry.calories} kcal, ${entry.distance} m, ${Math.floor(entry.duration / 60)}:${this.formatTime(entry.duration % 60)}`;
            this.historyList.appendChild(li);
        });
    }

    /**
     * Aktualisiert das Diagramm mit dem Schrittverlauf.
     */
    updateChart() {
        this.stepHistory.push(this.stepCount);
        if (this.stepHistory.length > this.maxHistoryPoints) this.stepHistory.shift();
        this.stepsChart.data.labels = Array.from({ length: this.stepHistory.length }, (_, i) => i + 1);
        this.stepsChart.data.datasets[0].data = this.stepHistory;
        this.stepsChart.update();
    }

    /**
     * Zeigt eine Fehlermeldung als In-Page-Alert.
     * @param {string} message - Die anzuzeigende Fehlermeldung
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-error';
        errorDiv.innerText = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    /**
     * Zeigt eine Erfolgsmeldung als In-Page-Alert.
     * @param {string} message - Die anzuzeigende Erfolgsmeldung
     */
    showSuccess(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-success';
        errorDiv.innerText = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

/**
 * Initialisiert die App, wenn die Seite geladen wird.
 */
document.addEventListener('DOMContentLoaded', () => {
    const tracker = new FitnessTracker();
    tracker.initialize();
});
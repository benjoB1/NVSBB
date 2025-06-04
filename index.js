let stepCount = 0;
let caloriesBurned = 0;
let distanceCovered = 0; // In Metern
let lastTime = 0; // Zeitstempel der letzten Bewegung
let stepLength = 0.8; // Durchschnittliche Schrittlänge in Metern
let workoutType = 'jogging'; // Standardwert für Workout
let workoutTimer = null; // Timer Referenz
let elapsedTime = 0; // Zeit in Sekunden
let isPaused = false; // Pause-Status
let stepHistory = []; // Array für Schrittverlauf
let reminderInterval = null; // Interval für Erinnerung
const maxHistoryPoints = 50; // Maximale Datenpunkte für Chart

// DOM-Elemente
const stepDisplay = document.getElementById('step-count');
const caloriesDisplay = document.getElementById('calories-burned');
const distanceDisplay = document.getElementById('distance-covered');
const locationDisplay = document.getElementById('location-info');
const workoutSelect = document.getElementById('workout-select');
const workoutTimerDisplay = document.getElementById('workout-timer');
const notificationTimeInput = document.getElementById('notification-time');
const dailyReminderCheckbox = document.getElementById('daily-reminder');
const startButton = document.getElementById('start-workout');
const pauseButton = document.getElementById('pause-workout');
const stopButton = document.getElementById('stop-workout');
const historyList = document.getElementById('workout-history');

// Chart.js Setup
const ctx = document.getElementById('steps-chart').getContext('2d');
const stepsChart = new Chart(ctx, {
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

// Wenn die Seite geladen wird
document.addEventListener('DOMContentLoaded', () => {
    console.log('Webseite ist geladen.');
    initializeFitnessTracking();
});

function initializeFitnessTracking() {
    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleDeviceMotion);
    } else {
        console.log("Device Motion wird nicht unterstützt.");
        showError("Dieses Gerät unterstützt keine Bewegungsdaten.");
    }

    workoutSelect.addEventListener('change', () => {
        workoutType = workoutSelect.value;
        caloriesBurned = calculateCalories(workoutType);
        updateDisplays();
    });

    getCurrentLocation();
    setupPushNotifications();
    setupWorkoutControls();
    loadProgress();
    updateHistory();
}

function handleDeviceMotion(event) {
    if (isPaused) return;

    let accX = event.acceleration.x || 0;
    let accY = event.acceleration.y || 0;
    let accZ = event.acceleration.z || 0;

    let totalAcceleration = Math.sqrt(accX * accX + accY * accY + accZ * accZ);

    if (totalAcceleration > 2) {
        let currentTime = new Date().getTime();
        if (currentTime - lastTime > 500) {
            stepCount++;
            distanceCovered = stepCount * stepLength;
            caloriesBurned = calculateCalories(workoutType);
            lastTime = currentTime;

            updateChart();
            saveProgress();
            updateDisplays();
        }
    }
}

function calculateCalories(workout) {
    const calorieFactors = {
        jogging: 0.07,
        cycling: 0.05,
        strength: 0.06,
        swimming: 0.08,
        yoga: 0.03,
        hiit: 0.1
    };
    return stepCount * (calorieFactors[workout] || 0);
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                let lat = position.coords.latitude;
                let lon = position.coords.longitude;
                getAddressFromCoordinates(lat, lon);
            },
            (error) => {
                console.log("Standortfehler: ", error);
                locationDisplay.innerText = "Standort nicht verfügbar";
                showError("Standort konnte nicht abgerufen werden.");
            }
        );
    } else {
        console.log("Geolocation wird nicht unterstützt.");
        showError("Geolocation wird auf diesem Gerät nicht unterstützt.");
    }
}

function getAddressFromCoordinates(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.address) {
                const street = data.address.road || 'Unbekannt';
                const city = data.address.city || 'Unbekannt';
                locationDisplay.innerText = `${street}, ${city}`;
            } else {
                locationDisplay.innerText = "Adresse nicht gefunden";
            }
        })
        .catch(error => {
            console.log("Reverse-Geocoding Fehler: ", error);
            locationDisplay.innerText = "Fehler bei der Standortbestimmung";
            showError("Adresse konnte nicht geladen werden.");
        });
}

function updateDisplays() {
    stepDisplay.innerText = `Schritte: ${stepCount}`;
    caloriesDisplay.innerText = `Kalorien: ${caloriesBurned.toFixed(2)} kcal`;
    distanceDisplay.innerText = `Distanz: ${distanceCovered.toFixed(2)} m`;
}

function setupPushNotifications() {
    document.getElementById('set-reminder').addEventListener('click', () => {
        if (!notificationTimeInput.value) {
            showError("Bitte eine gültige Zeit auswählen.");
            return;
        }
        if (reminderInterval) {
            clearInterval(reminderInterval);
            console.log("Vorheriger Reminder-Interval gelöscht");
        }
        setReminder(notificationTimeInput.value, dailyReminderCheckbox.checked);
    });
}

function setReminder(time, isDaily) {
    const [reminderHour, reminderMinute] = time.split(":").map(Number);
    let targetTime = null;

    // Funktion zum Überprüfen und Auslösen der Erinnerung
    function checkReminder() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        console.log(`Aktuelle Zeit: ${currentHour}:${currentMinute}, Zielzeit: ${reminderHour}:${reminderMinute}`);

        if (currentHour === reminderHour && currentMinute === reminderMinute) {
            // In-Page-Benachrichtigung
            showInPageReminder(`Zeit für dein ${workoutType} Workout!`);
            // Browser-Alert
            alert(`Zeit für dein ${workoutType} Workout!`);
            console.log("Alert-Benachrichtigung ausgelöst");
            // Native Benachrichtigung
            if (Notification.permission === "granted") {
                new Notification("Zeit für dein Workout!", {
                    body: `Dein ${workoutType} Workout wartet!`,
                    icon: './icon.png' // Optional: Füge ein Icon hinzu
                });
                console.log("Native Benachrichtigung ausgelöst");
            }
            // Wenn nicht täglich, Interval beenden
            if (!isDaily) {
                clearInterval(reminderInterval);
                console.log("Einmalige Erinnerung abgeschlossen");
            }
        }
    }

    // Setze Zielzeit für die erste Erinnerung
    targetTime = new Date();
    targetTime.setHours(reminderHour, reminderMinute, 0, 0);
    if (targetTime < new Date()) {
        targetTime.setDate(targetTime.getDate() + 1);
    }

    console.log(`Erinnerung geplant für: ${targetTime.toLocaleString()}`);
    showSuccess(`Erinnerung gesetzt für ${targetTime.toLocaleTimeString()}${isDaily ? ' (täglich)' : ''}`);

    // Starte Interval, um jede Minute zu prüfen
    reminderInterval = setInterval(checkReminder, 60000); // Prüft jede Minute
    // Sofort prüfen, falls die Zeit bereits erreicht ist
    checkReminder();
}

function showInPageReminder(message) {
    const reminderDiv = document.createElement('div');
    reminderDiv.className = 'alert alert-reminder';
    reminderDiv.innerText = message;
    document.body.appendChild(reminderDiv);
    setTimeout(() => reminderDiv.remove(), 5000);
}

function setupWorkoutControls() {
    startButton.addEventListener('click', startWorkout);
    pauseButton.addEventListener('click', togglePauseWorkout);
    stopButton.addEventListener('click', stopWorkout);
}

function startWorkout() {
    if (workoutTimer) return;
    showSuccess(`Workout gestartet: ${workoutType}`);
    startTimer();
    startButton.disabled = true;
    pauseButton.disabled = false;
    stopButton.disabled = false;
}

function togglePauseWorkout() {
    isPaused = !isPaused;
    pauseButton.innerText = isPaused ? "Fortsetzen" : "Pausieren";
    showSuccess(isPaused ? "Workout pausiert" : "Workout fortgesetzt");
}

function stopWorkout() {
    if (workoutTimer) {
        clearInterval(workoutTimer);
        workoutTimer = null;
    }
    isPaused = false;
    pauseButton.innerText = "Pausieren";
    startButton.disabled = false;
    pauseButton.disabled = true;
    stopButton.disabled = true;
    saveWorkoutHistory();
    showSuccess("Workout beendet");
}

function startTimer() {
    elapsedTime = 0;
    if (workoutTimer) clearInterval(workoutTimer);
    workoutTimer = setInterval(() => {
        if (!isPaused) {
            elapsedTime++;
            let minutes = Math.floor(elapsedTime / 60);
            let seconds = elapsedTime % 60;
            workoutTimerDisplay.innerText = `Verstrichene Zeit: ${formatTime(minutes)}:${formatTime(seconds)}`;
        }
    }, 1000);
}

function formatTime(time) {
    return time < 10 ? `0${time}` : time;
}

function saveProgress() {
    localStorage.setItem('stepCount', stepCount);
    localStorage.setItem('caloriesBurned', caloriesBurned);
    localStorage.setItem('distanceCovered', distanceCovered);
}

function loadProgress() {
    if (localStorage.getItem('stepCount')) {
        stepCount = parseInt(localStorage.getItem('stepCount')) || 0;
        caloriesBurned = parseFloat(localStorage.getItem('caloriesBurned')) || 0;
        distanceCovered = parseFloat(localStorage.getItem('distanceCovered')) || 0;
        updateDisplays();
        updateChart();
    }
}

function saveWorkoutHistory() {
    const history = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
    history.push({
        date: new Date().toLocaleString(),
        workoutType,
        steps: stepCount,
        calories: caloriesBurned.toFixed(2),
        distance: distanceCovered.toFixed(2),
        duration: elapsedTime
    });
    localStorage.setItem('workoutHistory', JSON.stringify(history));
    updateHistory();
}

function updateHistory() {
    const history = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
    historyList.innerHTML = '';
    history.slice(-5).forEach(entry => {
        const li = document.createElement('li');
        li.innerText = `${entry.date}: ${entry.workoutType} - ${entry.steps} Schritte, ${entry.calories} kcal, ${entry.distance} m, ${Math.floor(entry.duration / 60)}:${formatTime(entry.duration % 60)}`;
        historyList.appendChild(li);
    });
}

function updateChart() {
    stepHistory.push(stepCount);
    if (stepHistory.length > maxHistoryPoints) stepHistory.shift();
    stepsChart.data.labels = Array.from({ length: stepHistory.length }, (_, i) => i + 1);
    stepsChart.data.datasets[0].data = stepHistory;
    stepsChart.update();
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.innerText = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

function showSuccess(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-success';
    errorDiv.innerText = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}
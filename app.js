const circle = document.getElementById('timer-circle');

const STATES = {
    IDLE: 'IDLE',
    FOCUS: 'FOCUS',
    BREAK: 'BREAK'
};

const DURATIONS = {
    FOCUS: 25 * 60 * 1000,
    BREAK: 5 * 60 * 1000
};

// Configuration
const LONG_PRESS_DURATION = 2000;

let currentState = STATES.IDLE;
let endTime = null;
let timerInterval = null;
let longPressTimer = null;

// Load state from storage
function loadState() {
    const savedState = localStorage.getItem('pomodoro_state');
    const savedEndTime = localStorage.getItem('pomodoro_endTime');

    if (savedState && savedEndTime) {
        const now = Date.now();
        const target = parseInt(savedEndTime, 10);
        
        if (target > now) {
            // Timer still running
            currentState = savedState;
            endTime = target;
            startTimerLoop();
            updateUI();
        } else {
            // Timer expired while away
            handleExpiredState(savedState, target, now);
        }
    } else {
        resetToIdle();
    }
}

function handleExpiredState(lastState, lastEndTime, now) {
    // Calculate how much time has passed since the last timer ended
    let timeSinceEnd = now - lastEndTime;
    
    // We need to simulate the loop to find the current state
    // Cycle: Focus (25) -> Break (5) -> Focus (25) ...
    
    // However, for simplicity and user experience, if the user opens the app 
    // and the timer has long finished, maybe just reset or show the next state?
    // Let's try to be smart.
    
    if (lastState === STATES.FOCUS) {
        // Focus finished. Did Break also finish?
        if (timeSinceEnd < DURATIONS.BREAK) {
            // We are in Break
            currentState = STATES.BREAK;
            endTime = lastEndTime + DURATIONS.BREAK;
            startTimerLoop();
            updateUI();
        } else {
            // Break also finished. Back to Focus?
            // Let's just reset to IDLE if it's been a long time to avoid confusion.
            // Or start next Focus?
            // Let's reset to IDLE if the full cycle (Focus+Break) passed.
            resetToIdle();
        }
    } else if (lastState === STATES.BREAK) {
        // Break finished. Back to Focus?
        if (timeSinceEnd < DURATIONS.FOCUS) {
             currentState = STATES.FOCUS;
             endTime = lastEndTime + DURATIONS.FOCUS;
             startTimerLoop();
             updateUI();
        } else {
            resetToIdle();
        }
    } else {
        resetToIdle();
    }
}

function saveState() {
    localStorage.setItem('pomodoro_state', currentState);
    if (endTime) {
        localStorage.setItem('pomodoro_endTime', endTime);
    } else {
        localStorage.removeItem('pomodoro_endTime');
    }
}

function clearState() {
    localStorage.removeItem('pomodoro_state');
    localStorage.removeItem('pomodoro_endTime');
}

function updateUI() {
    circle.className = 'circle'; // Reset classes
    if (currentState === STATES.FOCUS) {
        circle.classList.add('focus');
    } else if (currentState === STATES.BREAK) {
        circle.classList.add('break');
    }
}

function startFocus() {
    currentState = STATES.FOCUS;
    endTime = Date.now() + DURATIONS.FOCUS;
    saveState();
    updateUI();
    startTimerLoop();
    vibrate([100, 50, 100]); // Double pulse for start
}

function startBreak() {
    currentState = STATES.BREAK;
    endTime = Date.now() + DURATIONS.BREAK;
    saveState();
    updateUI();
    startTimerLoop();
    vibrate([500]); // Long pulse for break
}

function resetToIdle() {
    currentState = STATES.IDLE;
    endTime = null;
    if (timerInterval) clearInterval(timerInterval);
    clearState();
    updateUI();
    vibrate(50); // Short tick
}

function startTimerLoop() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const now = Date.now();
        if (now >= endTime) {
            // Timer finished
            if (currentState === STATES.FOCUS) {
                startBreak();
            } else if (currentState === STATES.BREAK) {
                startFocus();
            }
        }
    }, 1000);
}

function vibrate(pattern) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

// Interaction
let pressStartTime = 0;

circle.addEventListener('mousedown', handlePressStart);
circle.addEventListener('touchstart', handlePressStart, {passive: false});

circle.addEventListener('mouseup', handlePressEnd);
circle.addEventListener('touchend', handlePressEnd);
circle.addEventListener('mouseleave', cancelPress);

function handlePressStart(e) {
    // e.preventDefault(); // Prevent default to avoid ghost clicks, but might block scroll? App is fixed, so ok.
    // Actually, passive: false on touchstart allows preventDefault.
    if (e.cancelable) e.preventDefault();
    
    pressStartTime = Date.now();
    
    longPressTimer = setTimeout(() => {
        resetToIdle();
    }, LONG_PRESS_DURATION);
}

function handlePressEnd(e) {
    if (longPressTimer) clearTimeout(longPressTimer);
    
    const pressDuration = Date.now() - pressStartTime;
    
    if (pressDuration < 500) {
        // Short tap
        if (currentState === STATES.IDLE) {
            startFocus();
        }
    }
}

function cancelPress() {
    if (longPressTimer) clearTimeout(longPressTimer);
}

// Initialize
loadState();

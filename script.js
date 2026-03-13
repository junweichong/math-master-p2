import { state } from "./js/state.js";
import { dom } from "./js/dom.js";
import { showScreen, updateMenuUI, updateToggleUI, refreshHighScores, rotateMode, preloadAssets } from "./js/ui.js";
import { rotateScoreDisplay } from "./js/scoring.js";
import { startGame, checkAnswer } from "./js/game.js";

// Initialization
function init() {
    preloadAssets();
    setupEventListeners();
    updateToggleUI();
    updateStartButtonState();
}

function setupEventListeners() {
    // Mode Selection
    document.querySelectorAll('.btn-mode').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
            const target = e.target.closest('.btn-mode');
            if (!target) return;
            target.classList.add('active');
            state.mode = target.dataset.mode;
            state.scoreDisplayMode = state.mode;
            refreshHighScores();
        });
    });

    // Start Game
    dom.btnStart.addEventListener('click', startGame);

    // Answer Input Listener
    dom.gameInput.addEventListener('input', () => {
        state.userAnswer = dom.gameInput.value;
    });

    // Name & Class Listeners
    dom.playerNameInput.addEventListener('input', () => {
        state.playerName = dom.playerNameInput.value.trim();
        updateStartButtonState();
    });
    dom.playerClassSelect.addEventListener('change', () => {
        state.playerClass = dom.playerClassSelect.value;
    });

    // Form Submit
    dom.gameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        checkAnswer();
    });

    // Score Navigation
    document.getElementById('score-prev').addEventListener('click', () => {
        rotateScoreDisplay(-1);
        refreshHighScores();
    });
    document.getElementById('score-next').addEventListener('click', () => {
        rotateScoreDisplay(1);
        refreshHighScores();
    });

    // Level Navigation
    dom.levelPrev.addEventListener('click', () => rotateMode(-1));
    dom.levelNext.addEventListener('click', () => rotateMode(1));

    // Quit Game
    document.getElementById('btn-quit').addEventListener('click', () => showScreen('menu'));

    // Home Button
    document.getElementById('btn-home').addEventListener('click', () => showScreen('menu'));

    // Game Type Toggle
    dom.btnTogglePractice.forEach(btn => {
        btn.addEventListener('click', () => {
            state.gameType = 'practice';
            updateToggleUI();
        });
    });

    dom.btnToggleChallenge.forEach(btn => {
        btn.addEventListener('click', () => {
            state.gameType = 'challenge';
            updateToggleUI();
        });
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (state.screen === 'game') {
            let val = e.key;

            if ((e.key >= '0' && e.key <= '9') || (e.code && e.code.startsWith('Numpad'))) {
                if (document.activeElement === dom.gameInput) {
                    return;
                }

                if (val.length > 1 && e.code.startsWith('Numpad')) {
                    val = e.key;
                    if (!/^\d$/.test(val)) val = e.code.replace('Numpad', '');
                }

                if (/^\d$/.test(val)) {
                    dom.gameInput.value += val;
                    state.userAnswer = dom.gameInput.value;
                }
            }

            if (e.key === 'Backspace' || e.key === 'Delete') {
                if (document.activeElement === dom.gameInput) {
                    return;
                }
                dom.gameInput.value = dom.gameInput.value.slice(0, -1);
                state.userAnswer = dom.gameInput.value;
            }

            if (e.key === 'Enter' || e.key === 'NumpadEnter') {
                if (document.activeElement !== dom.gameInput) {
                    checkAnswer();
                }
            }
            if (e.key === 'Escape') showScreen('menu');
        } else if (state.screen === 'gameover') {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                showScreen('menu');
            }
        }
    });
}

// Helper to manage start button state
function updateStartButtonState() {
    dom.btnStart.disabled = !state.playerName || state.playerName.trim() === '';
}

// Start
init();

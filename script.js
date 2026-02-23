import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, where, serverTimestamp, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAy8R6zibVCkuxBMjfCiSTF15fkKUU1b4g",
    authDomain: "math-master-p2.firebaseapp.com",
    projectId: "math-master-p2",
    storageBucket: "math-master-p2.firebasestorage.app",
    messagingSenderId: "1025712699946",
    appId: "1:1025712699946:web:afa0559d8963a67daf6153"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Game State
const state = {
    screen: 'menu', // menu, playing, gameover
    mode: 'mixed', // addition, subtraction, mixed
    playerName: '',
    score: 0,
    timeRemaining: 0,
    num1: 0,
    num2: 0,
    operator: '+',
    userAnswer: '',
    timerInterval: null,
    scoreDisplayMode: 'mixed'
};

// Config
const CONFIG = {
    TIME_2MIN: 120,
    MAX_HIGH_SCORES: 5
};

// DOM Elements
const screens = {
    menu: document.getElementById('screen-menu'),
    game: document.getElementById('screen-game'),
    gameover: document.getElementById('screen-gameover')
};

const dom = {
    playerNameInput: document.getElementById('player-name'),
    btnStart: document.getElementById('btn-start'),
    scoreList: document.getElementById('score-list'),
    scoreTitle: document.getElementById('score-title'),
    gamePlayerName: document.getElementById('game-player-name'),
    gameScore: document.getElementById('game-score'),
    gameTimer: document.getElementById('game-timer'),
    num1Container: document.getElementById('num1-container'),
    num2Container: document.getElementById('num2-container'),
    operator: document.getElementById('operator'),
    gameInput: document.getElementById('game-input'),
    gameForm: document.getElementById('game-form'),
    finalScore: document.getElementById('final-score'),
    resultPlayer: document.getElementById('result-player')
};

// Audio
const sfxCorrect = new Audio('sounds/ding.wav');
// Fallback if file missing
sfxCorrect.onerror = () => console.log("Audio file missing, skipping sound.");

// Initialization
function init() {
    loadScores();
    setupEventListeners();
    updateMenuUI();
}

function setupEventListeners() {
    // Mode Selection
    document.querySelectorAll('.btn-mode').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.mode = e.target.dataset.mode;
            state.scoreDisplayMode = state.mode;
            loadScores();
        });
    });

    // Start Game
    dom.btnStart.addEventListener('click', startGame);

    // Answer Input Listener
    dom.gameInput.addEventListener('input', () => {
        state.userAnswer = dom.gameInput.value;
    });

    // Form Submit (Handles both physical Enter and virtual Go button)
    dom.gameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        checkAnswer();
    });

    // Score Navigation
    document.getElementById('score-prev').addEventListener('click', () => rotateScoreDisplay(-1));
    document.getElementById('score-next').addEventListener('click', () => rotateScoreDisplay(1));

    // Quit Game
    document.getElementById('btn-quit').addEventListener('click', () => showScreen('menu'));

    // Home Button
    document.getElementById('btn-home').addEventListener('click', () => showScreen('menu'));

    // Keyboard support (Physical only)
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

// --- Navigation ---
function showScreen(screenName) {
    if (state.timerInterval) clearInterval(state.timerInterval);

    Object.values(screens).forEach(s => {
        s.classList.remove('active');
        s.querySelectorAll('input').forEach(i => i.blur());
    });

    screens[screenName].classList.add('active');
    state.screen = screenName;

    if (screenName === 'menu') {
        loadScores();
    } else if (screenName === 'game') {
        document.activeElement.blur();
    }
}

// --- Game Logic ---
function startGame() {
    state.playerName = dom.playerNameInput.value.trim() || "Player 1";
    state.score = 0;
    state.userAnswer = '';
    state.timeRemaining = CONFIG.TIME_2MIN;

    updateGameUI();
    generateQuestion();
    showScreen('game');
    startTimer();
}

function startTimer() {
    updateTimerDisplay();
    state.timerInterval = setInterval(() => {
        state.timeRemaining--;
        updateTimerDisplay();
        if (state.timeRemaining <= 0) {
            endGame();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(state.timeRemaining / 60).toString().padStart(2, '0');
    const s = (state.timeRemaining % 60).toString().padStart(2, '0');
    dom.gameTimer.textContent = `Time: ${m}:${s}`;
}

function generateQuestion() {
    let op = state.mode;
    if (state.mode === 'mixed') {
        op = Math.random() > 0.5 ? 'addition' : 'subtraction';
    }

    if (op === 'subitizing') {
        state.operator = '';
        state.num1 = Math.floor(Math.random() * 11); // 0-10
        state.num2 = 0;
    } else if (op === 'addition10') {
        state.operator = '+';
        state.num1 = Math.floor(Math.random() * 9) + 1;
        state.num2 = Math.floor(Math.random() * (10 - state.num1)) + 1;
    } else if (op === 'subtraction10') {
        state.operator = '-';
        state.num1 = Math.floor(Math.random() * 9) + 2;
        state.num2 = Math.floor(Math.random() * (state.num1 - 1)) + 1;
    } else if (op === 'addition') {
        state.operator = '+';
        state.num1 = Math.floor(Math.random() * 10) + 1;
        state.num2 = Math.floor(Math.random() * 10) + 1;
    } else {
        state.operator = '-';
        state.num1 = Math.floor(Math.random() * 15) + 5;
        state.num2 = Math.floor(Math.random() * state.num1) + 1;
    }

    displayQuestion();
}

function displayQuestion() {
    dom.num1Container.innerHTML = '';
    dom.num2Container.innerHTML = '';
    dom.operator.textContent = state.operator;
    dom.gameInput.value = '';
    dom.gameInput.className = 'answer-box';
    dom.gameInput.focus();

    if (state.mode === 'subitizing') {
        dom.operator.style.display = 'none';
        dom.num2Container.style.display = 'none';
        renderNumberVisual(state.num1, dom.num1Container, 'sub_');
    } else {
        dom.operator.style.display = 'block';
        dom.num2Container.style.display = 'flex';
        renderNumberVisual(state.num1, dom.num1Container);
        renderNumberVisual(state.num2, dom.num2Container);
    }
}

function renderNumberVisual(num, container, prefix = '') {
    const img = new Image();
    img.src = `images/${prefix}${num}.png`;
    img.onload = () => container.appendChild(img);
    img.onerror = () => {
        const dots = document.createElement('div');
        dots.className = 'dots';
        for (let i = 0; i < num; i++) {
            const d = document.createElement('div');
            d.className = 'dot';
            dots.appendChild(d);
        }
        container.innerHTML = '';
        container.appendChild(dots);
    }
}

function checkAnswer() {
    state.userAnswer = dom.gameInput.value;
    if (state.userAnswer === '') return;

    const userVal = parseInt(state.userAnswer);
    let correctVal;
    if (state.mode === 'subitizing') {
        correctVal = state.num1;
    } else {
        if (state.operator === '+') correctVal = state.num1 + state.num2;
        else correctVal = state.num1 - state.num2;
    }

    if (userVal === correctVal) {
        state.score++;
        dom.gameInput.classList.add('correct');
        sfxCorrect.currentTime = 0;
        sfxCorrect.play().catch(e => { });

        setTimeout(() => {
            generateQuestion();
            updateGameUI();
        }, 500);
    } else {
        dom.gameInput.classList.add('wrong');

        // Level 1 modes (Practice) don't end on mistake
        const isLevel1 = ['subitizing', 'addition10', 'subtraction10'].includes(state.mode);
        if (!isLevel1) {
            setTimeout(() => endGame(), 800);
        }
    }
    updateGameUI();
}

function updateGameUI() {
    dom.gameScore.textContent = `Score: ${state.score}`;
    dom.gamePlayerName.textContent = `Player: ${state.playerName}`;
}

function endGame() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    saveScore();
    dom.finalScore.textContent = state.score;
    dom.resultPlayer.textContent = `Good job, ${state.playerName}!`;
    showScreen('gameover');
}

// --- Scoring System (Firebase) ---
async function loadScores() {
    // Clear the board and show loading state
    dom.scoreList.innerHTML = '<li class="score-item" style="justify-content:center; color:#aaa;">Loading scores...</li>';

    try {
        const q = query(
            collection(db, "scores"),
            where("mode", "==", state.scoreDisplayMode),
            limit(100) // Fetch up to 100 recent scores to sort in JS
        );

        const querySnapshot = await getDocs(q);
        const allScores = [];
        querySnapshot.forEach((doc) => {
            allScores.push(doc.data());
        });

        // Sort in JS to bypass Firestore's composite index requirement
        const topScores = allScores
            .sort((a, b) => b.score - a.score)
            .slice(0, CONFIG.MAX_HIGH_SCORES);

        renderHighScores(topScores);
    } catch (e) {
        console.error("Error loading scores:", e);
        dom.scoreList.innerHTML = '<li class="score-item" style="justify-content:center; color:#e74c3c;">Error loading scores</li>';
    }
}

async function saveScore() {
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    try {
        await addDoc(collection(db, "scores"), {
            name: state.playerName,
            score: state.score,
            mode: state.mode,
            date: today,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("Error saving score:", e);
    }
}

function rotateScoreDisplay(dir) {
    const modes = ['subitizing', 'addition10', 'subtraction10', 'addition', 'subtraction', 'mixed'];
    let idx = modes.indexOf(state.scoreDisplayMode);

    // Safety check if current mode is not in the list
    if (idx === -1) idx = 0;

    idx = (idx + dir + modes.length) % modes.length;
    state.scoreDisplayMode = modes[idx];
    loadScores();
}

function renderHighScores(topScores) {
    const titles = {
        subitizing: 'Subitizing',
        addition10: 'Addition (10)',
        subtraction10: 'Subtraction (10)',
        addition: 'Addition (20)',
        subtraction: 'Subtraction (20)',
        mixed: 'Mixed (+-)'
    };
    dom.scoreTitle.innerHTML = `High Scores<br><span class="score-mode">${titles[state.scoreDisplayMode] || state.scoreDisplayMode}</span>`;

    dom.scoreList.innerHTML = topScores.map((s, i) => `
        <li class="score-item">
            <span class="score-rank">${i + 1}.</span>
            <span class="score-name">${s.name}</span>
            <span class="score-val">${s.score}</span>
            <span class="score-date">(${s.date})</span>
        </li>
    `).join('');

    if (topScores.length === 0) {
        dom.scoreList.innerHTML = '<li class="score-item" style="justify-content:center; color:#aaa;">No scores yet</li>';
    }
}

function updateMenuUI() {
    const modeBtn = document.querySelector(`[data-mode="${state.mode}"]`);
    if (modeBtn) modeBtn.classList.add('active');
    loadScores();
}

// Start
init();

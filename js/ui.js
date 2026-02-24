import { state } from "./state.js";
import { dom, screens } from "./dom.js";
import { loadScores } from "./scoring.js";

export async function refreshHighScores() {
    dom.scoreList.innerHTML = '<li class="score-item" style="justify-content:center; color:#aaa;">Loading scores...</li>';
    try {
        const topScores = await loadScores();
        renderHighScores(topScores);
    } catch (e) {
        dom.scoreList.innerHTML = '<li class="score-item" style="justify-content:center; color:#e74c3c;">Error loading scores</li>';
    }
}

export function showScreen(screenName) {
    if (state.timerInterval) clearInterval(state.timerInterval);

    Object.values(screens).forEach(s => {
        s.classList.remove('active');
        s.querySelectorAll('input').forEach(i => i.blur());
    });

    screens[screenName].classList.add('active');
    state.screen = screenName;

    if (screenName === 'menu') {
        refreshHighScores();
    } else if (screenName === 'game') {
        document.activeElement.blur();
    }
}

export function updateMenuUI() {
    // Determine which group we are in
    const modesInNumberSense = ['subitizing', 'placerace', 'patterns'];
    if (modesInNumberSense.includes(state.mode)) {
        state.currentGroup = 'Number Sense';
    } else {
        state.currentGroup = 'Plus and Minus';
    }

    // Update Title
    dom.levelTitle.textContent = state.currentGroup;

    // Show/Hide Groups
    const isNumberSense = state.currentGroup === 'Number Sense';
    dom.groupNumberSense.classList.toggle('active', isNumberSense);
    dom.groupPlusMinus.classList.toggle('active', !isNumberSense);

    // Update Button Highlights
    document.querySelectorAll('.btn-mode').forEach(btn => btn.classList.remove('active'));
    const modeBtn = document.querySelector(`[data-mode="${state.mode}"]`);
    if (modeBtn) modeBtn.classList.add('active');

    refreshHighScores();
}

export function updateTimerDisplay() {
    const m = Math.floor(state.timeRemaining / 60).toString().padStart(2, '0');
    const s = (state.timeRemaining % 60).toString().padStart(2, '0');
    dom.gameTimer.textContent = `Time: ${m}:${s}`;
}

export function renderHighScores(topScores) {
    const titles = {
        subitizing: 'Subitizing',
        placerace: 'Place Race',
        patterns: 'Number Patterns',
        addition10: 'Addition (10)',
        subtraction10: 'Subtraction (10)',
        addition: 'Addition (20)',
        subtraction: 'Subtraction (20)',
        mixed: 'Mixed (+-)'
    };
    const typeLabel = state.scoreDisplayType.charAt(0).toUpperCase() + state.scoreDisplayType.slice(1);
    dom.scoreTitle.innerHTML = `High Scores (${typeLabel})<br><span class="score-mode">${titles[state.scoreDisplayMode] || state.scoreDisplayMode}</span>`;

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

export function updateGameUI() {
    dom.gameScore.textContent = `Score: ${state.score}`;
    dom.gamePlayerName.textContent = `Player: ${state.playerName}`;
}

export function displayQuestion() {
    dom.num1Container.innerHTML = '';
    dom.num2Container.innerHTML = '';
    dom.questionTextDisplay.innerHTML = '';
    dom.operator.textContent = state.operator;
    dom.gameInput.value = '';
    dom.gameInput.className = 'answer-box';
    dom.gameInput.focus();

    if (state.mode === 'subitizing') {
        dom.operator.style.display = 'none';
        dom.num2Container.style.display = 'none';
        dom.questionTextDisplay.style.display = 'none';
        dom.num1Container.style.display = 'flex';
        renderNumberVisual(state.num1, dom.num1Container, 'sub_');
    } else if (state.operator === 'text') {
        dom.num1Container.style.display = 'none';
        dom.num2Container.style.display = 'none';
        dom.operator.style.display = 'none';
        dom.questionTextDisplay.style.display = 'block';
        dom.questionTextDisplay.innerHTML = state.currentQuestionText;
    } else {
        dom.operator.style.display = 'block';
        dom.num2Container.style.display = 'flex';
        dom.num1Container.style.display = 'flex';
        dom.questionTextDisplay.style.display = 'none';
        renderNumberVisual(state.num1, dom.num1Container);
        renderNumberVisual(state.num2, dom.num2Container);
    }
}

const imageCache = {};

export function preloadAssets() {
    const imagesToLoad = [
        ...Array.from({ length: 21 }, (_, i) => `${i}.png`), // 0.png through 20.png (0 might fall back to dots)
        ...Array.from({ length: 11 }, (_, i) => `sub_${i}.png`) // sub_0.png through sub_10.png
    ];

    imagesToLoad.forEach(file => {
        const img = new Image();
        img.src = `images/${file}`;
        imageCache[file] = img;
    });
}

export function renderNumberVisual(num, container, prefix = '') {
    const filename = `${prefix}${num}.png`;
    const cachedImg = imageCache[filename];

    if (cachedImg && cachedImg.complete) {
        container.innerHTML = '';
        container.appendChild(cachedImg.cloneNode(true));
        return;
    }

    // Fallback if not loaded yet or not found
    const img = new Image();
    img.src = `images/${filename}`;
    img.onload = () => {
        container.innerHTML = '';
        container.appendChild(img);
    };
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
    };
}

export function updateToggleUI() {
    const isChallenge = state.gameType === 'challenge';

    document.documentElement.classList.toggle('theme-challenge', isChallenge);

    dom.btnToggleChallenge.forEach(btn => btn.classList.toggle('active', isChallenge));
    dom.btnTogglePractice.forEach(btn => btn.classList.toggle('active', !isChallenge));

    dom.toggleBlurb.forEach(p => {
        p.textContent = isChallenge
            ? "Mistakes end the game. Aim for high scores!"
            : "Unlimited mistakes. Practice without pressure.";
    });

    state.scoreDisplayType = state.gameType;
    refreshHighScores();
}

export function rotateMode(dir) {
    const groups = ['Number Sense', 'Plus and Minus'];
    const groupModes = {
        'Number Sense': ['subitizing', 'placerace', 'patterns'],
        'Plus and Minus': ['addition10', 'subtraction10', 'addition', 'subtraction', 'mixed']
    };

    let groupIdx = groups.indexOf(state.currentGroup);
    if (groupIdx === -1) groupIdx = 0;

    groupIdx = (groupIdx + dir + groups.length) % groups.length;
    state.currentGroup = groups[groupIdx];

    // Pick the first mode of the new group
    state.mode = groupModes[state.currentGroup][0];
    state.scoreDisplayMode = state.mode;

    updateMenuUI();
}

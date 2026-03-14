import { state } from "./state.js";
import { dom } from "./dom.js";
import { CONFIG } from "./config.js";
import { showScreen, updateTimerDisplay, updateGameUI, updateMenuUI, displayQuestion, renderNumberVisual } from "./ui.js";
import { saveScore } from "./scoring.js";

const sfxCorrect = new Audio('sounds/ding.wav');
const sfxWrong = new Audio('sounds/wrong.wav');

sfxCorrect.onerror = () => console.log("Correct sound missing.");
sfxWrong.onerror = () => console.log("Wrong sound missing.");

let isEnding = false;
let isProcessingAnswer = false;

export function startGame() {
    state.playerName = dom.playerNameInput.value.trim();
    if (!state.playerName) return; // Safety check

    isEnding = false;
    isProcessingAnswer = false;
    state.score = 0;
    state.userAnswer = '';
    state.gameLog = [];
    state.timeRemaining = CONFIG.TIME_2MIN;

    updateGameUI();
    generateQuestion();
    showScreen('game');
    startTimer();
}

export function startTimer() {
    updateTimerDisplay();
    state.timerInterval = setInterval(() => {
        state.timeRemaining--;
        updateTimerDisplay();
        if (state.timeRemaining <= 0) {
            endGame();
        }
    }, 1000);
}

export function generateQuestion() {
    let op = state.mode;
    if (state.mode === 'mixed') {
        op = Math.random() > 0.5 ? 'addition' : 'subtraction';
    }

    if (op === 'subitizing') {
        state.operator = '';
        state.num1 = Math.floor(Math.random() * 11);
        state.num2 = 0;
        state.correctAnswer = state.num1;
    } else if (op === 'placerace') {
        const valueSets = [
            [1, 2, 3, 4, 5],
            [10, 20, 30, 40, 50],
            [100, 200, 300, 400, 500]
        ];
        const selectedSet = valueSets[Math.floor(Math.random() * valueSets.length)];
        const value = selectedSet[Math.floor(Math.random() * selectedSet.length)];
        const isMore = Math.random() > 0.5;
        const operatorWord = isMore ? "more than" : "less than";

        let baseNum, answer;
        let attempts = 0;
        do {
            baseNum = Math.floor(Math.random() * 1001);
            answer = isMore ? baseNum + value : baseNum - value;
            attempts++;
        } while ((answer < 0 || answer > 1000) && attempts < 50);

        state.currentQuestionText = `What is ${value} ${operatorWord} ${baseNum}?`;
        state.correctAnswer = answer;
        state.operator = 'text'; // Marker for UI
    } else if (op === 'patterns') {
        const steps = [1, 2, 5, 10, 100];
        const step = steps[Math.floor(Math.random() * steps.length)];
        const direction = Math.random() > 0.5 ? 1 : -1;

        let sequence = [];
        let startNum;
        let attempts = 0;

        do {
            startNum = Math.floor(Math.random() * 1001);
            sequence = [];
            const offset = Math.floor(Math.random() * 5);
            for (let i = 0; i < 5; i++) {
                sequence.push(startNum + (i - offset) * step * direction);
            }
            attempts++;
        } while (sequence.some(n => n < 0 || n > 1000) && attempts < 50);

        const hideIdx = Math.floor(Math.random() * 5);
        state.correctAnswer = sequence[hideIdx];
        sequence[hideIdx] = "⠀<b>?</b>⠀";

        state.currentQuestionText = sequence.join(", ");
        state.operator = 'text';
    } else if (op === 'addition10') {
        state.operator = '+';
        state.num1 = Math.floor(Math.random() * 9) + 1;
        state.num2 = Math.floor(Math.random() * (10 - state.num1)) + 1;
        state.correctAnswer = state.num1 + state.num2;
    } else if (op === 'subtraction10') {
        state.operator = '-';
        state.num1 = Math.floor(Math.random() * 9) + 2;
        state.num2 = Math.floor(Math.random() * (state.num1 - 1)) + 1;
        state.correctAnswer = state.num1 - state.num2;
    } else if (op === 'addition') {
        state.operator = '+';
        state.num1 = Math.floor(Math.random() * 10) + 1;
        state.num2 = Math.floor(Math.random() * 10) + 1;
        state.correctAnswer = state.num1 + state.num2;
    } else {
        state.operator = '-';
        state.num1 = Math.floor(Math.random() * 15) + 5;
        state.num2 = Math.floor(Math.random() * state.num1) + 1;
        state.correctAnswer = state.num1 - state.num2;
    }

    displayQuestion();
}


export function checkAnswer() {
    if (isProcessingAnswer || isEnding) return;

    state.userAnswer = dom.gameInput.value;
    if (state.userAnswer === '') return;

    isProcessingAnswer = true;
    const userVal = parseInt(state.userAnswer);
    const correctVal = state.correctAnswer;

    if (userVal === correctVal) {
        state.score++;
        const logEntry = {
            num1: state.num1,
            num2: state.num2,
            operator: state.operator,
            mode: state.mode,
            questionText: state.currentQuestionText,
            answer: userVal,
            correctAnswer: state.correctAnswer,
            correct: true,
            timestamp: Date.now()
        };
        state.gameLog.push(logEntry);

        dom.gameInput.classList.add('correct');
        sfxCorrect.currentTime = 0;
        sfxCorrect.play().catch(e => { });

        setTimeout(() => {
            generateQuestion();
            updateGameUI();
            isProcessingAnswer = false;
        }, 500);
    } else {
        const logEntry = {
            num1: state.num1,
            num2: state.num2,
            operator: state.operator,
            mode: state.mode,
            questionText: state.currentQuestionText,
            answer: userVal,
            correctAnswer: state.correctAnswer,
            correct: false,
            timestamp: Date.now()
        };
        state.gameLog.push(logEntry);

        dom.gameInput.classList.add('wrong');
        sfxWrong.currentTime = 0;
        sfxWrong.play().catch(e => { });

        if (state.gameType === 'challenge') {
            setTimeout(() => endGame(), 800);
        } else {
            setTimeout(() => {
                dom.gameInput.value = '';
                dom.gameInput.classList.remove('wrong');
                isProcessingAnswer = false;
            }, 800);
        }
    }
    updateGameUI();
}

export function endGame() {
    if (isEnding) return;
    isEnding = true;
    isProcessingAnswer = false;

    if (state.timerInterval) clearInterval(state.timerInterval);
    saveScore();
    dom.finalScore.textContent = state.score;
    dom.resultPlayer.textContent = `Good job, ${state.playerName}!`;
    showScreen('gameover');
}

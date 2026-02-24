export const state = {
    screen: 'menu', // menu, playing, gameover
    mode: 'subitizing',
    playerName: '',
    score: 0,
    timeRemaining: 0,
    num1: 0,
    num2: 0,
    operator: '+',
    userAnswer: '',
    timerInterval: null,
    scoreDisplayMode: 'subitizing',
    scoreDisplayType: 'challenge', // default display matches default gameType (which I set to challenge in HTML earlier, wait, I set it to practice in state but user changed it back in HTML? No, I set it to practice in state, and user reverted HTML to challenge. I should probably match the current state.gameType default).
    gameType: 'practice', // practice or challenge
    currentGroup: 'Number Sense', // 'Number Sense' or 'Plus and Minus'
    playerName: '',
    playerClass: '2A',
    correctAnswer: 0,
    currentQuestionText: ''
};

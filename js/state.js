export const state = {
    screen: 'menu', // menu, playing, gameover
    mode: 'mixed',
    playerName: '',
    score: 0,
    timeRemaining: 0,
    num1: 0,
    num2: 0,
    operator: '+',
    userAnswer: '',
    timerInterval: null,
    scoreDisplayMode: 'mixed',
    scoreDisplayType: 'challenge', // default display matches default gameType
    gameType: 'challenge', // practice or challenge
    currentGroup: 'Plus and Minus', // 'Number Sense' or 'Plus and Minus'
    playerName: '',
    playerClass: '2A',
    correctAnswer: 0,
    currentQuestionText: '',
    gameLog: [] // Store a transcript of the game for server-side verification
};

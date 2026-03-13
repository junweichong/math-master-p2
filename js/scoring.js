import { db, collection, serverTimestamp, addDoc } from "./firebase.js";
import { state } from "./state.js";
import { dom } from "./dom.js";
import { CONFIG } from "./config.js";

const CACHE_KEY_PREFIX = "math_master_scores_";
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour
const pendingFetches = new Map(); // Prevent duplicate concurrent requests



export async function saveScore() {
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const newScoreEntry = {
        name: state.playerName,
        class: state.playerClass,
        score: state.score,
        mode: state.mode,
        type: state.gameType,
        date: today,
        timestamp: Date.now() // Use local time for immediate cache update
    };

    try {
        // Save to DB (costs 1 write)
        await addDoc(collection(db, "scores"), {
            ...newScoreEntry,
            timestamp: serverTimestamp() // Override with server time for DB consistency
        });
        
        // UPGRADE: Instead of removing cache, we update it locally!
        const cacheKey = `${CACHE_KEY_PREFIX}${state.mode}_${state.gameType}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            let { scores, timestamp } = JSON.parse(cached);
            scores.push(newScoreEntry);
            scores.sort((a, b) => b.score - a.score);
            scores = scores.slice(0, CONFIG.MAX_HIGH_SCORES);
            
            localStorage.setItem(cacheKey, JSON.stringify({ scores, timestamp }));
            console.log("Local highscore cache updated (0 reads needed).");
        }
    } catch (e) {
        console.error("Error saving score:", e);
    }
}

export function rotateScoreDisplay(dir) {
    const modes = ['subitizing', 'placerace', 'patterns', 'addition10', 'subtraction10', 'addition', 'subtraction', 'mixed'];
    let idx = modes.indexOf(state.scoreDisplayMode);

    if (idx === -1) idx = 0;

    idx = (idx + dir + modes.length) % modes.length;
    state.scoreDisplayMode = modes[idx];
}

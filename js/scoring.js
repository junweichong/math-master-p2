import { db, collection, getDocs, query, where, serverTimestamp, addDoc, orderBy, limit } from "./firebase.js";
import { state } from "./state.js";
import { dom } from "./dom.js";
import { CONFIG } from "./config.js";

const CACHE_KEY_PREFIX = "math_master_scores_";
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour

export async function loadScores() {
    const cacheKey = `${CACHE_KEY_PREFIX}${state.scoreDisplayMode}_${state.scoreDisplayType}`;
    
    // 1. Check Local Cache (Immediate feedback from SaveScore)
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        const { scores, timestamp } = JSON.parse(cachedData);
        // If it was updated in the last hour, trust it
        if (Date.now() - timestamp < CACHE_EXPIRY) {
            return scores;
        }
    }

    try {
        console.log(`[Static] Fetching scores from JSON for ${state.scoreDisplayMode}`);
        // 2. Fetch the static JSON file (0 Firestore reads!)
        const response = await fetch('js/scores.json');
        if (!response.ok) throw new Error("Could not load scores.json");
        
        const allScores = await response.json();
        const scores = (allScores[state.scoreDisplayMode] && allScores[state.scoreDisplayMode][state.scoreDisplayType]) || [];

        // 3. Cache it locally
        localStorage.setItem(cacheKey, JSON.stringify({
            scores: scores,
            timestamp: Date.now()
        }));

        return scores;
    } catch (e) {
        console.error("Error loading scores:", e);
        if (cachedData) return JSON.parse(cachedData).scores;
        return [];
    }
}

export async function saveScore() {
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    
    // 1. Full entry for Firestore (private)
    const dbEntry = {
        name: state.playerName,
        class: state.playerClass,
        score: state.score,
        mode: state.mode,
        type: state.gameType,
        date: today,
        timestamp: serverTimestamp()
    };

    // 2. Minimal entry for public cache/display
    const displayEntry = {
        name: state.playerName,
        score: state.score,
        date: today
    };

    try {
        // Save to DB (costs 1 write)
        await addDoc(collection(db, "scores"), dbEntry);
        
        // UPGRADE: Update local cache with minimal data
        const cacheKey = `${CACHE_KEY_PREFIX}${state.mode}_${state.gameType}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            let { scores, timestamp } = JSON.parse(cached);
            scores.push(displayEntry);
            scores.sort((a, b) => b.score - a.score);
            scores = scores.slice(0, CONFIG.MAX_HIGH_SCORES);
            
            localStorage.setItem(cacheKey, JSON.stringify({ scores, timestamp }));
            console.log("Local highscore cache updated (minimal data).");
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

import { db, collection, getDocs, query, where, serverTimestamp, addDoc, orderBy, limit } from "./firebase.js";
import { state } from "./state.js";
import { dom } from "./dom.js";
import { CONFIG } from "./config.js";

const CACHE_KEY_PREFIX = "math_master_scores_";
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour
const pendingFetches = new Map(); // Prevent duplicate concurrent requests

export async function loadScores() {
    const cacheKey = `${CACHE_KEY_PREFIX}${state.scoreDisplayMode}_${state.scoreDisplayType}`;
    
    // 1. Check if request is already in progress
    if (pendingFetches.has(cacheKey)) return pendingFetches.get(cacheKey);

    // 2. Check Cache
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        const { scores, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
            return scores;
        }
    }

    // 3. Fetch from Firestore
    const fetchPromise = (async () => {
        try {
            console.log(`[Firestore] Fetching: ${state.scoreDisplayMode} ${state.scoreDisplayType}`);
            const q = query(
                collection(db, "scores"),
                where("mode", "==", state.scoreDisplayMode),
                where("type", "==", state.scoreDisplayType),
                orderBy("score", "desc"),
                limit(CONFIG.MAX_HIGH_SCORES)
            );

            const querySnapshot = await getDocs(q);
            const allScores = [];
            querySnapshot.forEach((doc) => {
                allScores.push(doc.data());
            });

            localStorage.setItem(cacheKey, JSON.stringify({
                scores: allScores,
                timestamp: Date.now()
            }));

            return allScores;
        } catch (e) {
            console.error("Error loading scores:", e);
            if (cachedData) return JSON.parse(cachedData).scores;
            throw e;
        } finally {
            pendingFetches.delete(cacheKey);
        }
    })();

    pendingFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
}

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

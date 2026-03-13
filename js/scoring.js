import { db, collection, getDocs, query, where, serverTimestamp, addDoc, orderBy, limit } from "./firebase.js";
import { state } from "./state.js";
import { dom } from "./dom.js";
import { CONFIG } from "./config.js";

const CACHE_KEY_PREFIX = "math_master_scores_";
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

export async function loadScores() {
    const cacheKey = `${CACHE_KEY_PREFIX}${state.scoreDisplayMode}_${state.scoreDisplayType}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
        const { scores, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
            console.log(`Loading scores from cache for ${state.scoreDisplayMode} (${state.scoreDisplayType})`);
            return scores;
        }
    }

    try {
        console.log(`Fetching fresh scores from Firestore for ${state.scoreDisplayMode} (${state.scoreDisplayType})`);
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

        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({
            scores: allScores,
            timestamp: Date.now()
        }));

        return allScores;
    } catch (e) {
        console.error("Error loading scores:", e);
        // If error occurs, try to return stale cache if available
        if (cachedData) {
            const { scores } = JSON.parse(cachedData);
            return scores;
        }
        throw e;
    }
}

export async function saveScore() {
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    try {
        await addDoc(collection(db, "scores"), {
            name: state.playerName,
            class: state.playerClass,
            score: state.score,
            mode: state.mode,
            type: state.gameType,
            date: today,
            timestamp: serverTimestamp()
        });
        
        // Invalidate cache for this mode and type so user sees their new score
        const cacheKey = `${CACHE_KEY_PREFIX}${state.mode}_${state.gameType}`;
        localStorage.removeItem(cacheKey);
        console.log(`Cache invalidated for ${state.mode} (${state.gameType})`);
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

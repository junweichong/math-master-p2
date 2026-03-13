import { db, collection, serverTimestamp, addDoc, getDoc, setDoc, doc } from "./firebase.js";
import { state } from "./state.js";
import { dom } from "./dom.js";
import { CONFIG } from "./config.js";

const CACHE_KEY_PREFIX = "math_master_scores_";
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour
const pendingFetches = new Map(); // Prevent duplicate concurrent requests
export async function loadAggregatedScores() {
    const leaderboardId = `${state.scoreDisplayMode}_${state.scoreDisplayType}`;
    console.log(`[Firestore] Attempting to load leaderboard: ${leaderboardId}`);
    
    try {
        const docRef = doc(db, "leaderboards", leaderboardId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log(`[Firestore] Successfully loaded ${data.topScores?.length || 0} scores for ${leaderboardId}`);
            return data.topScores || [];
        } else {
            console.log(`[Firestore] No leaderboard found for ${leaderboardId}, returning empty list.`);
            return [];
        }
    } catch (e) {
        console.error(`[Firestore] Error loading aggregated scores for ${leaderboardId}:`, e);
        throw e;
    }
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
        console.log(`[Firestore] Starting saveScore for ${state.playerName} (${state.mode}_${state.gameType})`);
        // 1. Save FULL record for history (costs 1 write)
        await addDoc(collection(db, "scores"), {
            ...newScoreEntry,
            timestamp: serverTimestamp()
        });
        console.log("[Firestore] Full score record saved to 'scores' collection.");
        // 2. Update Aggregated Leaderboard (Top 5)
        const leaderboardId = `${state.mode}_${state.gameType}`;
        const docRef = doc(db, "leaderboards", leaderboardId);
        
        const docSnap = await getDoc(docRef);
        let currentTopScores = [];
        
        if (docSnap.exists()) {
            currentTopScores = docSnap.data().topScores || [];
        }
        
        // Add new score if it qualifies
        currentTopScores.push({
            name: newScoreEntry.name,
            score: newScoreEntry.score
        });
        
        // Sort and slice to Top 5
        currentTopScores.sort((a, b) => b.score - a.score);
        currentTopScores = currentTopScores.slice(0, 5);
        
        // Save back to Firestore (costs 1 write)
        await setDoc(docRef, { topScores: currentTopScores });
        console.log(`[Firestore] Leaderboard ${leaderboardId} updated successfully.`);

        // Update local cache as well
        const cacheKey = `${CACHE_KEY_PREFIX}${state.mode}_${state.gameType}`;
        localStorage.setItem(cacheKey, JSON.stringify({ 
            scores: currentTopScores, 
            timestamp: Date.now() 
        }));
        
    } catch (e) {
        console.error(`[Firestore] Error in saveScore for ${state.playerName}:`, e);
    }
}

export function rotateScoreDisplay(dir) {
    const modes = ['subitizing', 'placerace', 'patterns', 'addition10', 'subtraction10', 'addition', 'subtraction', 'mixed'];
    let idx = modes.indexOf(state.scoreDisplayMode);

    if (idx === -1) idx = 0;

    idx = (idx + dir + modes.length) % modes.length;
    state.scoreDisplayMode = modes[idx];
}

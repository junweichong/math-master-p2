import { db, collection, getDocs, query, where, serverTimestamp, addDoc } from "./firebase.js";
import { state } from "./state.js";
import { dom } from "./dom.js";
import { CONFIG } from "./config.js";

export async function loadScores() {
    try {
        const q = query(
            collection(db, "scores"),
            where("mode", "==", state.scoreDisplayMode),
            where("type", "==", state.scoreDisplayType)
        );

        const querySnapshot = await getDocs(q);
        const allScores = [];
        querySnapshot.forEach((doc) => {
            allScores.push(doc.data());
        });

        return allScores
            .sort((a, b) => b.score - a.score)
            .slice(0, CONFIG.MAX_HIGH_SCORES);
    } catch (e) {
        console.error("Error loading scores:", e);
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

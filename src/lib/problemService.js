import { getProblemsDAO, getProblemByIdDAO, createProblemDAO, updateStatusDAO, deleteProblemDAO, updateProblemDAO, findOldestPendingDAO, findRandomNewDAO } from './problemsRepository';
import { formatTagsForDb } from './utils';

// --- Service Layer (Business Logic) ---

export function getAllProblems(filter) {
    // If status is a single string, keep it as is (backward compatibility), 
    // but the DAO now handles arrays.
    return getProblemsDAO(filter);
}

export function getProblemById(id) {
    return getProblemByIdDAO(id);
}

export function deleteProblem(id) {
    return deleteProblemDAO(id);
}

export function updateProblem(id, data) {
    const updateData = { ...data };
    if (updateData.tags) {
        updateData.tags = formatTagsForDb(updateData.tags);
    }
    if (updateData.dificultad) {
        updateData.dificultad = updateData.dificultad ? parseInt(updateData.dificultad) : null;
    }
    if (updateData.completion_time_minutes) {
        updateData.completion_time_minutes = parseInt(updateData.completion_time_minutes);
    }
    return updateProblemDAO(id, updateData);
}

export function addNewProblem(data) {
    const problem = {
        nombre: data.nombre,
        url: data.url,
        origen: data.origen,
        tags: formatTagsForDb(data.tags), // Ensure valid JSON format
        estado: data.estado || 'nuevo',
        notas: data.notas,
        dificultad: data.dificultad ? parseInt(data.dificultad) : null,
        solved_at: data.solved_at || null,
        completion_time_minutes: data.completion_time_minutes ? parseInt(data.completion_time_minutes) : null
    };
    return createProblemDAO(problem);
}

export function changeProblemStatus(id, status) {
    // Here we could add logic for "Baul" protocol (e.g., logging the date)
    return updateStatusDAO(id, status);
}

export function getSmartRecommendation(filter = {}) {
    // 1. Methodology Priority: Upsolving (Clean the queue)
    // "Semana 1 (Upsolving): Limpiar la cola de pendientes."
    const oldestPending = findOldestPendingDAO(filter);
    
    if (oldestPending) {
        return {
            problem: oldestPending,
            reason: "Metodología: Limpiar cola de pendientes (FIFO)."
        };
    }

    // 2. If Queue is clean, look for New problems to start processing
    const randomNew = findRandomNewDAO(filter);
    if (randomNew) {
        return {
            problem: randomNew,
            reason: "Metodología: Explorar nuevos problemas."
        };
    }

    return null;
}

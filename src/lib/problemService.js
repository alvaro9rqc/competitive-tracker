import { getProblemsDAO, getProblemByIdDAO, createProblemDAO, updateStatusDAO, deleteProblemDAO, updateProblemDAO, findOldestModifiedNonFinalizedDAO } from './problemsRepository';
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
    const excludeIds = Array.isArray(filter.excludeIds)
        ? filter.excludeIds.filter((id) => Number.isInteger(id))
        : [];

    const oldestModified = findOldestModifiedNonFinalizedDAO({
        judge: filter.judge,
        excludeIds
    });

    if (oldestModified) {
        return {
            problem: oldestModified,
            reason: "Cola de revisión: problema no finalizado con modificación más antigua (máx. 2 meses)."
        };
    }

    return null;
}

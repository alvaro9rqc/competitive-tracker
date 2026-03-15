import { getProblemsDAO, getProblemByIdDAO, createProblemDAO, updateStatusDAO, deleteProblemDAO, updateProblemDAO, findOldestModifiedNonFinalizedDAO, findProblemByCanonicalKeyDAO, updateStatusWithSolvedAtFallbackDAO } from './problemsRepository';
import { formatTagsForDb, getCurrentLocalDateTime } from './utils';
import { syncProblemTags } from './tagsRepository';

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
    
    // Handle Tags: Sync with relational tables + Cache
    if (updateData.tags) {
         // If tags come as string "dp, graphs", parse it. If array, use it.
         let tagList = [];
         if (Array.isArray(updateData.tags)) {
             tagList = updateData.tags;
         } else if (typeof updateData.tags === 'string') {
             try {
                 const parsed = JSON.parse(updateData.tags);
                 tagList = Array.isArray(parsed) ? parsed : [String(parsed)];
             } catch {
                 tagList = updateData.tags.split(',').map(t => t.trim()).filter(Boolean);
             }
         }
         
         // Sync relational tables
         syncProblemTags(id, tagList);
         
         // Update data for the main table (DAO uses formatTagsForDb internally or we pass formatted)
         // Actually syncProblemTags updates the cache column too, but updateProblemDAO might overwrite it 
         // if we pass 'tags' in updateData.
         // Let's rely on syncProblemTags for the tags column update and remove it from updateData passed to DAO
         // OR better: let syncProblemTags handle normalization and just pass the formatted string to DAO for consistency
         updateData.tags = formatTagsForDb(tagList);
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
    // 1. Parse tags first
    let tagList = [];
    if (data.tags) {
         if (Array.isArray(data.tags)) {
             tagList = data.tags;
         } else if (typeof data.tags === 'string') {
             try {
                 const parsed = JSON.parse(data.tags);
                 tagList = Array.isArray(parsed) ? parsed : [String(parsed)];
             } catch {
                 tagList = data.tags.split(',').map(t => t.trim()).filter(Boolean);
             }
         }
    }

    const problem = {
        nombre: data.nombre,
        url: data.url,
        origen: data.origen,
        tags: formatTagsForDb(tagList), // Initial cache save
        estado: data.estado || 'nuevo',
        notas: data.notas,
        dificultad: data.dificultad ? parseInt(data.dificultad) : null,
        solved_at: data.solved_at || null,
        completion_time_minutes: data.completion_time_minutes ? parseInt(data.completion_time_minutes) : null
    };

    const duplicate = findProblemByCanonicalKeyDAO(problem);
    if (duplicate) {
        return {
            changes: 0,
            lastInsertRowid: duplicate.id,
            duplicate: true
        };
    }
    
    const result = createProblemDAO(problem);
    
    // 2. Sync tags relational tables
    if (result.lastInsertRowid) {
        syncProblemTags(result.lastInsertRowid, tagList);
    }
    
    return result;
}

export function changeProblemStatus(id, status) {
    if (status === 'finalizado') {
        return updateStatusWithSolvedAtFallbackDAO(id, status, getCurrentLocalDateTime());
    }
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

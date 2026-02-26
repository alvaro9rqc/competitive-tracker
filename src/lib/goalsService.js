import { getGoals, getGoalById, createGoal, deleteGoal, getMetricsByGoalId, createMetric, deleteMetric } from './goalsRepository';
import { getProblemsDAO } from './problemsRepository';

export { getGoals, getGoalById, createGoal, deleteGoal, createMetric, deleteMetric };

// Helper to check if a problem matches a filter
const matchesFilter = (problem, filter) => {
    if (filter.judge && problem.origen !== filter.judge) return false;
    if (filter.difficultyMin && (!problem.dificultad || problem.dificultad < filter.difficultyMin)) return false;
    if (filter.difficultyMax && (!problem.dificultad || problem.dificultad > filter.difficultyMax)) return false;
    if (filter.maxTimeMinutes && (!problem.completion_time_minutes || problem.completion_time_minutes > filter.maxTimeMinutes)) return false;
    return true;
};

export function getGoalWithStatus(goalId) {
    const goal = getGoalById(goalId);
    if (!goal) return null;

    const metrics = getMetricsByGoalId(goalId);
    const problems = getProblemsDAO(); // Get all problems
    
    // Sort problems by date might be good, but filtering is okay

    const enrichedMetrics = metrics.map(metric => {
        const baseFilter = JSON.parse(metric.base_filter_json);
        const targetFilter = JSON.parse(metric.target_filter_json);
        const days = [];
        
        // Calculate status for the last 14 days
        // Day 0 is today, Day 1 is yesterday, etc.
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // We want 14 squares, representing days [today-13, ..., today]
        for (let i = 13; i >= 0; i--) {
            const currentDay = new Date(today);
            currentDay.setDate(today.getDate() - i);
            
            // Window for calculation: 14 days back from currentDay
            // e.g., if currentDay is Feb 20, window is Feb 6 - Feb 20.
            const windowStart = new Date(currentDay);
            windowStart.setDate(currentDay.getDate() - 14);

            // Filter problems solved within this window AND matching Base Filter (B)
            const problemsInWindowB = problems.filter(p => {
                if (p.estado !== 'resuelto' && p.estado !== 'finalizado') return false;
                if (!p.solved_at) return false;

                const solvedDate = new Date(p.solved_at);
                solvedDate.setHours(0,0,0,0);
                
                const inWindow = solvedDate <= currentDay && solvedDate >= windowStart;
                
                if (!inWindow) return false;

                return matchesFilter(p, baseFilter);
            });

            const countB = problemsInWindowB.length;
            // From problems matching B, count those matching Target Filter (C)
            const countC = problemsInWindowB.filter(p => matchesFilter(p, targetFilter)).length;

            const ratio = countB > 0 ? countC / countB : 0;
            // If countB is 0, is it met? User didn't specify. Assuming if no problems, goal is not met or N/A.
            // Let's assume if countB is 0, it's not met (gray or red).
            const isMet = countB > 0 && ratio >= metric.target_ratio;

            days.push({
                date: currentDay.toISOString().split('T')[0],
                isMet,
                ratio: ratio.toFixed(2),
                countB,
                countC
            });
        }
        
        // Overall metric status depends on the LATEST day (today)
        const currentStatus = days[days.length - 1];

        return {
            ...metric,
            baseFilter,
            targetFilter,
            days,
            isMetToday: currentStatus.isMet,
            currentRatio: currentStatus.ratio
        };
    });

    // Goal is met if ALL metrics are met today
    const allMet = enrichedMetrics.length > 0 && enrichedMetrics.every(m => m.isMetToday);

    return {
        ...goal,
        metrics: enrichedMetrics,
        isMet: allMet
    };
}

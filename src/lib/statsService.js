import { getDailyActivity, getTotalSolvedCount, getStatusDistribution, getTagsDistribution, getScatterData } from './statsRepository';

// --- Stats Service ---

function toLocalDateString(dateValue) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateOnly(dateString) {
    const normalized = String(dateString || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
    const parsed = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getDashboardStats(filters = {}) {
    const requestedDays = Number.parseInt(filters.days, 10);
    const days = Number.isInteger(requestedDays) && requestedDays > 0 ? requestedDays : 30;
    const rawDaily = getDailyActivity({ ...filters, days });

    const dataMap = new Map();
    rawDaily.forEach(item => {
        dataMap.set(item.date, item.count);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let rangeStart = parseDateOnly(filters.dateFrom);
    let rangeEnd = parseDateOnly(filters.dateTo);

    if (!rangeEnd) {
        rangeEnd = new Date(today);
    }

    if (!rangeStart) {
        rangeStart = new Date(rangeEnd);
        rangeStart.setDate(rangeEnd.getDate() - (days - 1));
    }

    if (rangeStart > rangeEnd) {
        const temp = rangeStart;
        rangeStart = rangeEnd;
        rangeEnd = temp;
    }

    const dailyActivity = [];
    for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
        const dateStr = toLocalDateString(cursor);
        dailyActivity.push({
            date: dateStr,
            count: dataMap.get(dateStr) || 0
        });
    }

    let runningTotal = 0;
    const cumulativeActivity = dailyActivity.map(d => {
        runningTotal += d.count;
        return { date: d.date, count: runningTotal };
    });

    return {
        dailyActivity,
        cumulativeActivity,
        pulseRange: {
            startDate: toLocalDateString(rangeStart),
            endDate: toLocalDateString(rangeEnd),
            days: dailyActivity.length
        },
        statusDistribution: getStatusDistribution(),
        tagsDistribution: getTagsDistribution(),
        scatterData: getScatterData()
    };
}

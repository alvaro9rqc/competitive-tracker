export function parseTags(tagsInput) {
  if (!tagsInput) return [];
  if (Array.isArray(tagsInput)) return tagsInput;
  
  try {
    // Try parsing as JSON
    const parsed = JSON.parse(tagsInput);
    if (Array.isArray(parsed)) return parsed;
    return [String(parsed)];
  } catch (e) {
    // Fallback: Split by comma if it's a simple string
    return String(tagsInput).split(',').map(t => t.trim()).filter(Boolean);
  }
}

export function formatTagsForDb(tagsInput) {
    // Always try to save as JSON array string
    if (Array.isArray(tagsInput)) return JSON.stringify(tagsInput);
    
    // If it's a string like "dp, graphs", convert to array then stringify
    if (typeof tagsInput === 'string') {
        const split = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        return JSON.stringify(split);
    }
    
    return '[]';
}

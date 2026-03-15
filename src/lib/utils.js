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

function padTwo(value) {
  return String(value).padStart(2, '0');
}

export function formatDateTimeLocalInput(dateTimeValue) {
  if (!dateTimeValue) return '';
  const rawValue = String(dateTimeValue).trim();

  const directMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
  if (directMatch) {
    return `${directMatch[1]}T${directMatch[2]}:${directMatch[3]}`;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = padTwo(parsed.getMonth() + 1);
  const day = padTwo(parsed.getDate());
  const hours = padTwo(parsed.getHours());
  const minutes = padTwo(parsed.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function getCurrentLocalDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = padTwo(now.getMonth() + 1);
  const day = padTwo(now.getDate());
  const hours = padTwo(now.getHours());
  const minutes = padTwo(now.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

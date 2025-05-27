import Store from 'electron-store';
import { app } from 'electron';
import { join } from 'path';

const store = new Store({
  name: 'history',
  cwd: join(app.getPath('userData'), 'data'),
  defaults: {
    entries: []
  }
});

const MAX_HISTORY_ITEMS = 1000;

export function addToHistory(entry) {
  const entries = store.get('entries', []);
  
  // Проверяем, не является ли URL служебным
  if (entry.url.startsWith('chrome://') || 
      entry.url.startsWith('chrome-extension://') ||
      entry.url.startsWith('about:')) {
    return;
  }

  // Проверяем, существует ли уже такая запись
  const existingIndex = entries.findIndex(e => e.url === entry.url);
  
  if (existingIndex !== -1) {
    // Обновляем существующую запись
    entries[existingIndex] = {
      ...entries[existingIndex],
      ...entry,
      timestamp: Date.now(),
      visitCount: (entries[existingIndex].visitCount || 0) + 1
    };
  } else {
    // Добавляем новую запись
    entries.unshift({
      ...entry,
      timestamp: Date.now(),
      visitCount: 1
    });
  }

  // Ограничиваем количество записей
  if (entries.length > MAX_HISTORY_ITEMS) {
    entries.length = MAX_HISTORY_ITEMS;
  }

  store.set('entries', entries);
}

export function getHistory() {
  return store.get('entries', []);
}

export function searchHistory(query) {
  const entries = store.get('entries', []);
  const searchTerm = query.toLowerCase();
  
  return entries.filter(entry => 
    entry.url.toLowerCase().includes(searchTerm) ||
    (entry.title && entry.title.toLowerCase().includes(searchTerm))
  );
}

export function clearHistory() {
  store.set('entries', []);
}

export function removeFromHistory(url) {
  const entries = store.get('entries', []);
  const filteredEntries = entries.filter(entry => entry.url !== url);
  store.set('entries', filteredEntries);
}

export function getMostVisited(limit = 10) {
  const entries = store.get('entries', []);
  return entries
    .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
    .slice(0, limit);
}

export function getHistoryByDate(date) {
  const entries = store.get('entries', []);
  const startOfDay = new Date(date).setHours(0, 0, 0, 0);
  const endOfDay = new Date(date).setHours(23, 59, 59, 999);
  
  return entries.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= startOfDay && entryDate <= endOfDay;
  });
} 
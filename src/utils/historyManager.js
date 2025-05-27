import { app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

class HistoryManager {
  constructor() {
    this.history = [];
    // Используем правильный путь для сохранения истории
    this.historyFile = join(app.getPath('userData'), 'history.json');
    console.log('[History] Путь к файлу истории:', this.historyFile);
    this.loadHistory();
  }

  loadHistory() {
    try {
      if (existsSync(this.historyFile)) {
        const data = readFileSync(this.historyFile, 'utf8');
        this.history = JSON.parse(data);
        console.log('[History] История успешно загружена, записей:', this.history.length);
      } else {
        console.log('[History] Файл истории не найден, создаем новый');
      }
    } catch (error) {
      console.error('[History] Ошибка загрузки истории:', error);
      this.history = [];
    }
  }

  saveHistory() {
    try {
      writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
      console.log('[History] История успешно сохранена, записей:', this.history.length);
    } catch (error) {
      console.error('[History] Ошибка сохранения истории:', error);
    }
  }

  addEntry(url, title, favicon = null) {
    // Проверяем, не является ли URL внутренним
    if (!url || url.startsWith('about:') || url.startsWith('file:')) {
      return;
    }

    // Ищем существующую запись с таким же URL
    const existingEntryIndex = this.history.findIndex(entry => entry.url === url);
    
    if (existingEntryIndex !== -1) {
      // Обновляем существующую запись
      const existingEntry = this.history[existingEntryIndex];
      this.history[existingEntryIndex] = {
        ...existingEntry,
        title: title || existingEntry.title,
        favicon: favicon || existingEntry.favicon,
        timestamp: Date.now() // Обновляем время последнего посещения
      };
    } else {
      // Создаем новую запись
    const entry = {
        id: Date.now().toString(),
      url,
        title: title || url,
        favicon,
        timestamp: Date.now()
    };

      // Добавляем запись в начало массива
    this.history.unshift(entry);

    // Ограничиваем количество записей
      if (this.history.length > 1000) {
        this.history = this.history.slice(0, 1000);
    }
    }

    // Сохраняем изменения
    this.saveHistory();
  }

  getHistory() {
    console.log('HistoryManager: Getting history, current state:', this.history);
    // Убедимся, что возвращаем массив
    return Array.isArray(this.history) ? this.history : [];
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
  }

  removeEntry(id) {
    this.history = this.history.filter(entry => entry.id !== id);
    this.saveHistory();
  }
}

export const historyManager = new HistoryManager(); 
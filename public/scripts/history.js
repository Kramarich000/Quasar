let historyData = [];

async function loadHistory() {
  console.log('History page: Starting to load history...');
  try {
    console.log('History page: Calling window.api.getHistory()...');
    const data = await window.api.getHistory();
    console.log('History page: History data received:', data);
    // Преобразуем данные в массив, если они не являются массивом
    historyData = Array.isArray(data) ? data : [];
    renderHistory(historyData);
  } catch (error) {
    console.error('History page: Error loading history:', error);
    historyData = [];
    renderHistory([]);
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const months = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

function renderHistory(data) {
  const historyList = document.getElementById('historyList');
  // Очищаем список
  while (historyList.firstChild) {
    historyList.removeChild(historyList.firstChild);
  }

  if (data.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const emptyTitle = document.createElement('h2');
    emptyTitle.textContent = 'История пуста';

    const emptyText = document.createElement('p');
    emptyText.textContent = 'Посещенные страницы появятся здесь';

    emptyState.appendChild(emptyTitle);
    emptyState.appendChild(emptyText);
    historyList.appendChild(emptyState);
    return;
  }

  data.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'history-item';

    const contentWrapper = document.createElement('div');
    contentWrapper.style.display = 'flex';
    contentWrapper.style.justifyContent = 'space-between';
    contentWrapper.style.alignItems = 'start';

    const leftContent = document.createElement('div');
    leftContent.style.flex = '1';
    leftContent.style.display = 'flex';
    leftContent.style.alignItems = 'start';
    leftContent.style.gap = '12px';

    // Фавиконка
    const faviconContainer = document.createElement('div');
    faviconContainer.style.width = '16px';
    faviconContainer.style.height = '16px';
    faviconContainer.style.flexShrink = '0';

    if (entry.favicon) {
      const favicon = document.createElement('img');
      favicon.src = entry.favicon;
      favicon.alt = '';
      favicon.style.width = '100%';
      favicon.style.height = '100%';
      favicon.style.objectFit = 'contain';
      faviconContainer.appendChild(favicon);
    } else {
      const placeholder = document.createElement('div');
      placeholder.style.width = '100%';
      placeholder.style.height = '100%';
      placeholder.style.background = '#666';
      placeholder.style.borderRadius = '2px';
      faviconContainer.appendChild(placeholder);
    }

    const textContent = document.createElement('div');

    const title = document.createElement('h3');
    title.className = 'history-title';
    title.textContent = entry.title;

    const url = document.createElement('p');
    url.className = 'history-url';
    url.textContent = entry.url;

    const date = document.createElement('p');
    date.className = 'history-date';
    date.textContent = formatDate(entry.timestamp);

    textContent.appendChild(title);
    textContent.appendChild(url);
    textContent.appendChild(date);

    leftContent.appendChild(faviconContainer);
    leftContent.appendChild(textContent);

    // Кнопка удаления
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.setAttribute('data-id', entry.id);
    
    // Создаем SVG элемент
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');

    // Создаем path элементы
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M3 6h18');

    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2');

    // Добавляем path элементы в SVG
    svg.appendChild(path1);
    svg.appendChild(path2);

    // Добавляем SVG в кнопку
    deleteButton.appendChild(svg);

    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Предотвращаем всплытие события клика
        window.api.removeHistoryEntry(entry.id);
        loadHistory();
    });

    contentWrapper.appendChild(leftContent);
    contentWrapper.appendChild(deleteButton);
    item.appendChild(contentWrapper);

    // Добавляем обработчик клика на весь элемент истории
    item.addEventListener('click', () => {
        window.api.openExternalUrl(entry.url);
    });

    historyList.appendChild(item);
  });
}

// Обработчики событий
document.getElementById('searchInput').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = historyData.filter(
    (entry) =>
      entry.url.toLowerCase().includes(query) ||
      entry.title.toLowerCase().includes(query),
  );
  renderHistory(filtered);
});

document.getElementById('clearHistory').addEventListener('click', () => {
  if (confirm('Вы уверены, что хотите очистить всю историю?')) {
    window.api.clearHistory();
    loadHistory();
  }
});

// Загружаем историю при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  console.log('History page: DOM loaded, calling loadHistory()...');
  loadHistory();
});

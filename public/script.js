document
  .getElementById('searchInput')
  .addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      const query = this.value.trim();
      if (!query) return;

      let url;
      if (query.startsWith('http://') || query.startsWith('https://')) {
        url = query;
      } else if (query.includes('.') && !query.includes(' ')) {
        url = 'https://' + query;
      } else {
        url = 'https://www.google.com/search?q=' + encodeURIComponent(query);
      }

      window.location.href = url;
    }
  });

const searchInput = document.getElementById('searchInput');
const suggestionsContainer = document.getElementById('suggestionsContainer');
let currentSuggestions = [];
let selectedIndex = -1;

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function fetchGoogleSuggestions(query) {
  try {
    const response = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(
        query,
      )}`,
      {
        method: 'GET',
        mode: 'cors',
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Google suggestions:', data);
    return data[1] || [];
  } catch (error) {
    console.error('Error fetching Google suggestions:', error);
    return [];
  }
}

async function fetchDuckDuckGoSuggestions(query) {
  try {
    const response = await fetch(
      `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        mode: 'cors',
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('DuckDuckGo suggestions:', data);
    return data.map((item) => item.phrase) || [];
  } catch (error) {
    console.error('Error fetching DuckDuckGo suggestions:', error);
    return [];
  }
}

async function getSuggestions(query) {
  if (!query.trim()) {
    return [];
  }

  try {
    const [googleSuggestions, duckDuckGoSuggestions] = await Promise.all([
      fetchGoogleSuggestions(query),
      fetchDuckDuckGoSuggestions(query),
    ]);

    const allSuggestions = [
      ...new Set([...googleSuggestions, ...duckDuckGoSuggestions]),
    ];
    console.log('Combined suggestions:', allSuggestions);
    return allSuggestions.slice(0, 8); // Limit to 8 suggestions
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }
}

function updateSuggestions(suggestions) {
  while (suggestionsContainer.firstChild) {
    suggestionsContainer.removeChild(suggestionsContainer.firstChild);
  }
  currentSuggestions = suggestions;

  if (suggestions.length === 0) {
    suggestionsContainer.style.display = 'none';
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'suggestion-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute(
      'd',
      'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    );
    svg.appendChild(path);

    const span = document.createElement('span');
    span.textContent = suggestion;

    div.appendChild(svg);
    div.appendChild(span);

    div.addEventListener('click', () => {
      searchInput.value = suggestion;
      suggestionsContainer.style.display = 'none';
      searchInput.focus();
    });

    div.addEventListener('mouseover', () => {
      selectedIndex = index;
      updateSelectedSuggestion();
    });

    suggestionsContainer.appendChild(div);
  });

  suggestionsContainer.style.display = 'block';
}

function updateSelectedSuggestion() {
  const items = suggestionsContainer.getElementsByClassName('suggestion-item');
  Array.from(items).forEach((item, index) => {
    item.style.backgroundColor = index === selectedIndex ? '#f5f5f5' : '';
  });
}

searchInput.addEventListener('keydown', function (e) {
  if (suggestionsContainer.style.display === 'block') {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(
        selectedIndex + 1,
        currentSuggestions.length - 1,
      );
      updateSelectedSuggestion();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      updateSelectedSuggestion();
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      searchInput.value = currentSuggestions[selectedIndex];
      suggestionsContainer.style.display = 'none';
      const event = new Event('keydown');
      event.key = 'Enter';
      searchInput.dispatchEvent(event);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      suggestionsContainer.style.display = 'none';
      selectedIndex = -1;
    }
  }
});

searchInput.addEventListener(
  'input',
  debounce(function () {
    const query = this.value ? this.value.trim() : '';
    console.log('Input changed:', query);

    if (query.length < 2) {
      suggestionsContainer.style.display = 'none';
      return;
    }

    getSuggestions(query)
      .then((suggestions) => {
        console.log('Got suggestions:', suggestions);
        updateSuggestions(suggestions);
      })
      .catch((error) => {
        console.error('Error in input handler:', error);
        suggestionsContainer.style.display = 'none';
      });
  }, 300),
);

document.addEventListener('click', function (e) {
  if (
    !searchInput.contains(e.target) &&
    !suggestionsContainer.contains(e.target)
  ) {
    suggestionsContainer.style.display = 'none';
    selectedIndex = -1;
  }
});

const modal = document.getElementById('addSiteModal');
const addSiteButton = document.getElementById('addCustomSite');
const cancelButton = document.getElementById('cancelAddSite');
const addSiteForm = document.getElementById('addSiteForm');

function showModal() {
  modal.classList.add('active');
  document.getElementById('siteName').focus();
}

function hideModal() {
  modal.classList.remove('active');
  addSiteForm.reset();
}

addSiteButton.addEventListener('click', function (e) {
  e.preventDefault();
  showModal();
});

cancelButton.addEventListener('click', hideModal);

modal.addEventListener('click', function (e) {
  if (e.target === modal) {
    hideModal();
  }
});

addSiteForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const siteName = document.getElementById('siteName').value.trim();
  const siteUrl = document.getElementById('siteUrl').value.trim();

  if (!siteName || !siteUrl) {
    alert('Пожалуйста, заполните все поля');
    return;
  }

  try {
    new URL(siteUrl);
  } catch {
    alert('Пожалуйста, введите корректный URL');
    return;
  }

  const quickLinks = document.querySelector('.quick-links');
  const newLink = document.createElement('a');
  newLink.href = siteUrl;
  newLink.className = 'quick-link';

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('class', 'quick-link-icon');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'currentColor');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  );
  icon.appendChild(path);

  const text = document.createElement('span');
  text.className = 'quick-link-text';
  text.textContent = siteName;

  newLink.appendChild(icon);
  newLink.appendChild(text);

  quickLinks.insertBefore(newLink, addSiteButton);

  try {
    let customSites = [];
    const storedSites = localStorage.getItem('customSites');

    if (storedSites) {
      try {
        customSites = JSON.parse(storedSites);
        if (!Array.isArray(customSites)) {
          console.warn('Stored sites was not an array, resetting...');
          customSites = [];
        }
      } catch (parseError) {
        console.error('Error parsing stored sites:', parseError);
        customSites = [];
      }
    }

    const isDuplicate = customSites.some(
      (site) => site.url === siteUrl || site.name === siteName,
    );

    if (isDuplicate) {
      alert('Этот сайт уже добавлен');
      return;
    }

    customSites.push({ name: siteName, url: siteUrl });
    localStorage.setItem('customSites', JSON.stringify(customSites));
    console.log('Successfully saved to localStorage:', customSites);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    alert('Ошибка при сохранении сайта: ' + error.message);
  }

  hideModal();
});

window.addEventListener('load', function () {
  try {
    const storedSites = localStorage.getItem('customSites');
    console.log('Raw data from localStorage:', storedSites);

    if (!storedSites) {
      console.log('No custom sites found in localStorage');
      return;
    }

    let customSites;
    try {
      customSites = JSON.parse(storedSites);
      if (!Array.isArray(customSites)) {
        console.warn('Stored sites was not an array, resetting...');
        customSites = [];
      }
    } catch (parseError) {
      console.error('Error parsing stored sites:', parseError);
      customSites = [];
    }

    console.log('Parsed custom sites:', customSites);

    const quickLinks = document.querySelector('.quick-links');
    const addButton = document.getElementById('addCustomSite');

    const existingLinks = quickLinks.querySelectorAll(
      '.quick-link:not(#addCustomSite)',
    );
    existingLinks.forEach((link) => link.remove());

    customSites.forEach((site) => {
      const newLink = document.createElement('a');
      newLink.href = site.url;
      newLink.className = 'quick-link';

      const icon = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      icon.setAttribute('class', 'quick-link-icon');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('fill', 'currentColor');

      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      );
      path.setAttribute(
        'd',
        'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
      );
      icon.appendChild(path);

      const text = document.createElement('span');
      text.className = 'quick-link-text';
      text.textContent = site.name;

      newLink.appendChild(icon);
      newLink.appendChild(text);

      quickLinks.insertBefore(newLink, addButton);
    });

    console.log('Successfully loaded custom sites');
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    alert('Ошибка при загрузке сохраненных сайтов: ' + error.message);
  }
});

const installBtn = document.getElementById('install-btn');
const laterBtn = document.getElementById('later-btn');

installBtn.addEventListener('click', () => {
  window.api.installUpdate();
});

laterBtn.addEventListener('click', () => {
  window.api.deferUpdate();
});

window.api.on('onUpdateInfo', (info) => {
  const versionEl = document.getElementById('update-version');
  const dateEl = document.getElementById('update-date');
  const notesEl = document.getElementById('update-notes');
  notesEl.replaceChildren();
  versionEl.textContent = `Новая версия: ${info.version}`;
  dateEl.textContent = new Date(info.releaseDate).toLocaleDateString();

  if (Array.isArray(info.releaseNotes)) {
    const ol = document.createElement('ol');
    for (const note of info.releaseNotes) {
      const li = document.createElement('li');
      const fragment = parseReleaseNoteText(note.note || note);
      li.appendChild(fragment);
      ol.appendChild(li);
    }
    notesEl.appendChild(ol);
  } else if (typeof info.releaseNotes === 'string') {
    const fragment = parseReleaseNoteText(info.releaseNotes);
    notesEl.appendChild(fragment);
  }
});

function parseReleaseNoteText(text) {
  const container = document.createDocumentFragment();
  const lines = text.split(/<br\s*\/?>|<\/?p>|[\r\n]+/gi);

  lines.forEach((line, index) => {
    line = line.replace(/<\/?p>/gi, '').trim();

    if (!line) return;

    const p = document.createElement('p');
    p.textContent = line;
    container.appendChild(p);
  });

  return container;
}

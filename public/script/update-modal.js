const installBtn = document.getElementById('install-btn');
const laterBtn = document.getElementById('later-btn');

installBtn.addEventListener('click', () => {
  window.api.installUpdate();
});

laterBtn.addEventListener('click', () => {
  window.api.deferUpdate();
});

window.api.onUpdateInfo((info) => {
  const versionEl = document.getElementById('update-version');
  const dateEl = document.getElementById('update-date');
  const notesEl = document.getElementById('update-notes');

  versionEl.textContent = `Новая версия: ${info.version}`;
  dateEl.textContent = new Date(info.releaseDate).toLocaleDateString();

  if (Array.isArray(info.releaseNotes)) {
    const ul = document.createElement('ul');
    for (const note of info.releaseNotes) {
      const li = document.createElement('li');
      li.textContent = note.note || note;
      ul.appendChild(li);
    }
    notesEl.appendChild(ul);
  } else if (typeof info.releaseNotes === 'string') {
    const pre = document.createElement('pre');
    pre.textContent = info.releaseNotes;
    notesEl.appendChild(pre);
  }
});

/**
 * Gallery loader — fetches gallery.json and builds snap-scroll panels.
 * Falls back gracefully to the placeholder if no data exists yet.
 */
(function () {
  const DATA_URL = 'data/gallery.json';
  const gallery = document.getElementById('gallery');

  async function loadGallery() {
    let entries;
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) return; // no gallery data yet — show placeholder
      entries = await res.json();
    } catch {
      return; // offline or missing — placeholder stays
    }

    if (!entries || entries.length === 0) return;

    // Clear placeholder
    gallery.innerHTML = '';

    // Entries are ordered newest-first in the JSON
    entries.forEach(function (entry, i) {
      const section = document.createElement('section');
      section.className = 'gallery-panel';

      const inner = document.createElement('div');
      inner.className = 'panel-inner';

      const img = document.createElement('img');
      img.src = entry.image;
      img.alt = 'The Undercurrent — ' + entry.date;
      img.loading = i === 0 ? 'eager' : 'lazy';
      inner.appendChild(img);

      const footer = document.createElement('footer');
      footer.className = 'panel-label';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'label-date';
      dateSpan.textContent = formatDate(entry.date);
      footer.appendChild(dateSpan);

      const numSpan = document.createElement('span');
      numSpan.className = 'label-number';
      numSpan.textContent = 'No. ' + entry.number;
      footer.appendChild(numSpan);

      section.appendChild(inner);
      section.appendChild(footer);
      gallery.appendChild(section);
    });
  }

  function formatDate(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    }) + ' UTC';
  }

  loadGallery();
})();

/**
 * Gallery loader — fetches gallery.json and builds snap-scroll panels.
 * Falls back gracefully to the placeholder if no data exists yet.
 */
(function () {
  var DATA_URL = 'data/gallery.json';
  var HEADLINES_DIR = 'data/headlines/';
  var gallery = document.getElementById('gallery');
  var headlinesCache = {};

  async function loadGallery() {
    var entries;
    try {
      var res = await fetch(DATA_URL);
      if (!res.ok) return;
      entries = await res.json();
    } catch {
      return;
    }

    if (!entries || entries.length === 0) return;

    gallery.innerHTML = '';

    entries.forEach(function (entry, i) {
      var section = document.createElement('section');
      section.className = 'gallery-panel';
      section.dataset.date = entry.date;

      var inner = document.createElement('div');
      inner.className = 'panel-inner';

      var img = document.createElement('img');
      img.src = entry.image;
      img.alt = 'The Undercurrent \u2014 ' + entry.date;
      img.loading = i === 0 ? 'eager' : 'lazy';
      inner.appendChild(img);

      var headlinesPanel = document.createElement('aside');
      headlinesPanel.className = 'headlines-panel';

      var footer = document.createElement('footer');
      footer.className = 'panel-label';

      var dateSpan = document.createElement('span');
      dateSpan.className = 'label-date';
      dateSpan.textContent = formatDate(entry.date);
      footer.appendChild(dateSpan);

      var numSpan = document.createElement('span');
      numSpan.className = 'label-number';
      numSpan.textContent = 'No. ' + entry.number;
      footer.appendChild(numSpan);

      section.appendChild(inner);
      section.appendChild(headlinesPanel);
      section.appendChild(footer);
      gallery.appendChild(section);

      section.addEventListener('click', function (e) {
        // Don't toggle if clicking inside the scrollable headlines text
        if (e.target.closest('.headlines-panel') && section.classList.contains('revealed')) return;
        toggleHeadlines(section, entry.date);
      });
    });
  }

  async function toggleHeadlines(panel, date) {
    if (panel.classList.contains('revealed')) {
      panel.classList.remove('revealed');
      return;
    }

    var aside = panel.querySelector('.headlines-panel');

    // Load headlines on first reveal
    if (!headlinesCache[date]) {
      aside.innerHTML = '<p class="headlines-empty">Loading\u2026</p>';
      try {
        var res = await fetch(HEADLINES_DIR + date + '.json');
        if (res.ok) {
          headlinesCache[date] = await res.json();
        }
      } catch {}
    }

    if (headlinesCache[date]) {
      renderHeadlines(aside, headlinesCache[date]);
    } else {
      aside.innerHTML = '<p class="headlines-empty">Headlines not available for this date.</p>';
    }

    panel.classList.add('revealed');
  }

  function renderHeadlines(container, data) {
    container.innerHTML = '';
    var sources = data.sources || [];
    sources.forEach(function (source) {
      if (!source.headlines || source.headlines.length === 0) return;

      var div = document.createElement('div');
      div.className = 'headlines-source';

      var name = document.createElement('h3');
      name.className = 'headlines-source-name';
      name.textContent = source.source;
      div.appendChild(name);

      var ul = document.createElement('ul');
      ul.className = 'headlines-list';
      source.headlines.forEach(function (h) {
        var li = document.createElement('li');
        li.textContent = h;
        ul.appendChild(li);
      });
      div.appendChild(ul);

      container.appendChild(div);
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

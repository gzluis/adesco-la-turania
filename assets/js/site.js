(function () {
  'use strict';

  const menu = document.querySelector('[data-menu]');
  const nav = document.getElementById('nav');
  if (menu && nav) {
    menu.hidden = false;
    nav.classList.add('enhanced');
    function toggleMenu(open) {
      nav.classList.toggle('open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.textContent = open ? 'Cerrar menú' : 'Menú';
    }
    menu.addEventListener('click', () => toggleMenu(menu.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        toggleMenu(false);
        menu.focus();
      }
    });
    window.matchMedia('(max-width: 900px)').addEventListener('change', () => toggleMenu(false));
  }

  function dateLabel(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const date = new Date(value + 'T12:00:00Z');
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '';
    return date.toLocaleDateString('es-SV', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'});
  }
  function text(parent, tag, value, className) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const el = document.createElement(tag);
    el.textContent = value.trim();
    if (className) el.className = className;
    parent.append(el);
    return el;
  }
  function clean(value) {
    return typeof value === 'string' ? value.trim() : '';
  }
  function safeLink(value) {
    if (!clean(value)) return '';
    try {
      const url = new URL(value, location.href);
      if (url.protocol === 'https:' || (url.origin === location.origin && url.protocol === 'http:')) return url.href;
      if (location.protocol === 'file:' && !/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith('//')) return url.href;
    } catch (_) { return ''; }
    return '';
  }

  // Resultados verificados; null significa que no hay una cifra publicada.
  const campaign = window.LA_TURANIA_DATA || {};
  let reportVisible = false;
  for (const [key, value] of [['juguetes', campaign.juguetesRecibidos], ['beneficiarios', campaign.ninosBeneficiados]]) {
    if (!Number.isSafeInteger(value) || value < 0) continue;
    document.querySelectorAll('[data-count="' + key + '"]').forEach(el => {
      el.textContent = new Intl.NumberFormat('es-SV').format(value);
      el.closest('[data-metric]').hidden = false;
      reportVisible = true;
    });
  }
  const emptyReport = document.querySelector('[data-results-empty]');
  if (emptyReport && reportVisible) emptyReport.hidden = true;
  const reportDate = document.querySelector('[data-last-update]');
  if (reportDate && reportVisible && dateLabel(campaign.fechaReporte)) {
    reportDate.textContent = 'Última actualización: ' + dateLabel(campaign.fechaReporte);
    reportDate.hidden = false;
  }

  // Catálogo de iniciativas: conserva el formato del archivo data.js de la versión 1.0.
  const activities = (Array.isArray(window.INICIATIVAS) ? window.INICIATIVAS : [])
    .filter(item => item && clean(item.titulo));
  const sorted = [...activities].sort((a, b) => clean(b.fecha).localeCompare(clean(a.fecha)));
  function makeCard(item) {
    const card = document.createElement('article');
    card.className = 'initiative';
    card.dataset.activity = '';
    card.dataset.title = clean(item.titulo);
    card.dataset.category = clean(item.categoria);
    card.dataset.status = clean(item.estado);
    if (/^assets\/img\/[a-z0-9_./-]+\.(jpg|jpeg|png|webp)$/i.test(clean(item.imagen)) && !item.imagen.includes('..')) {
      const image = document.createElement('img');
      image.src = item.imagen;
      image.alt = clean(item.imagenAlt);
      image.width = 1200;
      image.height = 800;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => image.remove());
      card.append(image);
    }
    const body = document.createElement('div');
    body.className = 'card-body';
    text(body, 'p', [clean(item.categoria), clean(item.estado)].filter(Boolean).join(' · '), 'category');
    text(body, 'h3', item.titulo);
    if (dateLabel(item.fecha)) text(body, 'p', dateLabel(item.fecha), 'note');
    if (clean(item.lugar)) text(body, 'p', 'Lugar: ' + clean(item.lugar));
    text(body, 'p', item.descripcion);
    text(body, 'p', item.participacion);
    const url = safeLink(item.enlace);
    if (url) {
      const link = text(body, 'a', 'Más información sobre ' + item.titulo, 'link');
      link.href = url;
    }
    card.append(body);
    return card;
  }
  document.querySelectorAll('[data-initiatives]').forEach(list => {
    const entries = list.dataset.initiatives === 'home' ? sorted.slice(0, 3) : sorted;
    entries.forEach(item => list.append(makeCard(item)));
  });

  const filters = document.querySelector('[data-filters]');
  if (filters) {
    const cards = Array.from(document.querySelectorAll('[data-activity]'));
    if (cards.length > 1) {
      const search = document.getElementById('buscar');
      const category = document.getElementById('categoria');
      const status = document.getElementById('estado');
      const count = document.querySelector('[data-filter-count]');
      const noMatches = document.querySelector('[data-no-matches]');
      function populate(select, key) {
        const values = [...new Set(cards.map(card => card.dataset[key]).filter(Boolean))];
        values.sort((a, b) => a.localeCompare(b, 'es')).forEach(value => select.add(new Option(value, value)));
      }
      function normalize(value) {
        return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      }
      function filter() {
        let visible = 0;
        cards.forEach(card => {
          const matches = normalize(card.dataset.title + ' ' + card.textContent).includes(normalize(search.value)) &&
            (!category.value || card.dataset.category === category.value) && (!status.value || card.dataset.status === status.value);
          card.hidden = !matches;
          if (matches) visible++;
        });
        count.textContent = visible + (visible === 1 ? ' actividad encontrada' : ' actividades encontradas');
        noMatches.hidden = visible !== 0;
      }
      populate(category, 'category');
      populate(status, 'status');
      filters.hidden = false;
      count.hidden = false;
      filters.addEventListener('submit', event => event.preventDefault());
      filters.addEventListener('input', filter);
      filters.addEventListener('change', filter);
      filters.addEventListener('reset', () => setTimeout(filter, 0));
      filter();
    }
  }

  const otherResults = document.querySelector('[data-initiative-results]');
  if (otherResults) {
    const results = sorted.filter(item => clean(item.resultado));
    if (results.length) {
      otherResults.querySelector('[data-other-empty]').hidden = true;
      results.forEach(item => {
        const article = document.createElement('article');
        article.className = 'activity-result';
        text(article, 'h3', item.titulo);
        text(article, 'p', item.resultado);
        const date = dateLabel(item.fechaResultado);
        if (date) text(article, 'p', 'Actualización: ' + date, 'note');
        otherResults.append(article);
      });
    }
  }

  // Si una imagen no está disponible, el texto conserva todo su espacio.
  document.querySelectorAll('.photo img').forEach(image => {
    function hideImage() {
      const figure = image.closest('figure');
      figure.hidden = true;
      figure.parentElement.classList.add('no-photo');
    }
    image.addEventListener('error', hideImage);
    if (image.complete && !image.naturalWidth) hideImage();
  });

  const share = document.querySelector('[data-share]');
  if (share && ['https:', 'http:'].includes(location.protocol)) {
    share.hidden = false;
    const message = document.querySelector('[data-share-message]');
    const field = document.querySelector('[data-share-url]');
    share.addEventListener('click', async () => {
      const url = location.href.split('#')[0];
      try {
        if (navigator.share) { await navigator.share({title: 'Regalando Sonrisas · ADESCO La Turania', url}); return; }
        if (navigator.clipboard) { await navigator.clipboard.writeText(url); message.textContent = 'Enlace copiado.'; return; }
      } catch (error) { if (error.name === 'AbortError') return; }
      field.value = url;
      field.hidden = false;
      field.focus();
      field.select();
      message.textContent = 'Copia el enlace para compartirlo.';
    });
  }

})();

/* Yong Sin's portfolio: persistent soundtrack and same-tab project navigation. */
(() => {
  'use strict';
  const content = document.getElementById('site-view');
  const toggle = document.getElementById('music-toggle');
  const panel = document.getElementById('music-panel');
  const close = document.getElementById('music-close');
  const playerSlot = document.getElementById('music-video');
  const songId = '52qj0foHFvo';
  const sitePages = /\/(?:index\.html|projects\/[a-z0-9-]+\/(?:index\.html)?|creative\/(?:index\.html)?)$/i;
  let requestCounter = 0;

  function showPlayer() {
    if (!playerSlot || !panel) return;
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close music player');
    if (!playerSlot.querySelector('iframe')) {
      const iframe = document.createElement('iframe');
      iframe.title = 'Background music from YouTube';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      iframe.src = `https://www.youtube-nocookie.com/embed/${songId}?autoplay=1&playsinline=1&rel=0`;
      playerSlot.appendChild(iframe);
    }
  }
  function hidePlayer() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open music player');
    // The user explicitly closed the player; stop the audio.
    playerSlot.replaceChildren();
  }
  toggle?.addEventListener('click', () => panel.hidden ? showPlayer() : hidePlayer());
  close?.addEventListener('click', hidePlayer);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel && !panel.hidden) {
      hidePlayer();
      toggle.focus();
    }
  });

  function activateFilter(button) {
    const filter = button.getAttribute('data-filter');
    document.querySelectorAll('#site-view [data-filter]').forEach(el => {
      el.setAttribute('aria-pressed', String(el === button));
    });
    document.querySelectorAll('#site-view .cloud-card').forEach(card => {
      card.hidden = filter !== 'All' && card.dataset.category !== filter;
    });
  }
  // Delegation ensures the filters still work when returning to the homepage.
  document.addEventListener('click', event => {
    const filter = event.target.closest('button[data-filter]');
    if (filter) { activateFilter(filter); return; }
    const anchor = event.target.closest('a[href]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    let url;
    try { url = new URL(anchor.href, document.baseURI); } catch { return; }
    if (url.origin !== window.location.origin || !sitePages.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // Native anchor scrolling
    event.preventDefault();
    navigate(url, true);
  });

  // Relative image, video and document paths must remain valid after swapping page content.
  function absolutizePaths(view, destination) {
    for (const el of view.querySelectorAll('[href], [src], [poster], [srcset]')) {
      for (const attr of ['href', 'src', 'poster']) {
        if (!el.hasAttribute(attr)) continue;
        const raw = el.getAttribute(attr);
        if (!raw || /^(?:data:|blob:|mailto:|tel:|javascript:)/i.test(raw)) continue;
        try { el.setAttribute(attr, new URL(raw, destination).href); } catch {}
      }
      if (el.hasAttribute('srcset')) {
        const raw = el.getAttribute('srcset');
        el.setAttribute('srcset', raw.split(',').map(entry => {
          const bits = entry.trim().split(/\s+/);
          if (!bits.length) return entry;
          try { bits[0] = new URL(bits[0], destination).href; } catch {}
          return bits.join(' ');
        }).join(', '));
      }
    }
  }

  function moveToHash(hash, scrollY = 0) {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      const target = document.getElementById(id);
      if (target) { target.scrollIntoView(); return; }
    }
    window.scrollTo(0, scrollY);
  }

  async function navigate(destination, push) {
    const thisRequest = ++requestCounter;
    try {
      const response = await fetch(destination.pathname + destination.search, {cache: 'no-cache'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const html = await response.text();
      if (thisRequest !== requestCounter) return;
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const newContent = parsed.querySelector('#site-view');
      if (!newContent) throw new Error('Missing site content');
      absolutizePaths(newContent, destination);
      const newNodes = Array.from(newContent.childNodes).map(node => document.importNode(node, true));
      if (push) {
        history.replaceState({...history.state, scrollY: window.scrollY}, '', location.href);
        history.pushState({scrollY: 0}, '', destination.href);
      }
      content.replaceChildren(...newNodes);
      document.body.className = parsed.body.className;
      document.title = parsed.title || document.title;
      const y = !push && history.state?.scrollY ? history.state.scrollY : 0;
      requestAnimationFrame(() => moveToHash(destination.hash, y));
      // The YouTube iframe lives OUTSIDE #site-view. It is never destroyed here.
    } catch (error) {
      // If navigation fails, behave like an ordinary static GitHub Pages website.
      window.location.assign(destination.href);
    }
  }

  // Back and forward also preserve the player and restore normal navigation.
  window.addEventListener('popstate', () => navigate(new URL(location.href), false));
})();

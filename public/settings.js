(() => {
  const STORAGE_KEY = 'lifexp-appearance-v1'
  const GAME_KEYS = ['lifexp-save-v2', 'lifexp-save-v1']
  const palettes = [
    { id: 'forest', label: 'Forest', neonLabel: 'Neon green', swatch: 'linear-gradient(135deg,#07110c 45%,#62bd78 46%,#244b2e)' },
    { id: 'ocean', label: 'Ocean', neonLabel: 'Electric cyan', swatch: 'linear-gradient(135deg,#071018 45%,#74d5d6 46%,#245d67)' },
    { id: 'violet', label: 'Midnight', neonLabel: 'Neon violet', swatch: 'linear-gradient(135deg,#0b0914 45%,#b89afa 46%,#503a78)' },
    { id: 'ember', label: 'Ember', neonLabel: 'Neon orange', swatch: 'linear-gradient(135deg,#140b08 45%,#ffb477 46%,#713b26)' },
    { id: 'rose', label: 'Rosewood', neonLabel: 'Neon pink', swatch: 'linear-gradient(135deg,#140b11 45%,#ed9cbe 46%,#6d3950)' },
    { id: 'slate', label: 'Slate', neonLabel: 'Ice blue', swatch: 'linear-gradient(135deg,#0c1117 45%,#a8cbd8 46%,#435969)' },
  ]
  const fonts = [
    { id: 'system', label: 'System UI', family: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    { id: 'arial', label: 'Arial', family: 'Arial, Helvetica, sans-serif' },
    { id: 'verdana', label: 'Verdana', family: 'Verdana, Geneva, sans-serif' },
    { id: 'tahoma', label: 'Tahoma', family: 'Tahoma, Geneva, sans-serif' },
    { id: 'trebuchet', label: 'Trebuchet MS', family: '"Trebuchet MS", sans-serif' },
    { id: 'georgia', label: 'Georgia', family: 'Georgia, serif' },
    { id: 'times', label: 'Times New Roman', family: '"Times New Roman", Times, serif' },
    { id: 'courier', label: 'Courier New', family: '"Courier New", monospace' },
    { id: 'palatino', label: 'Palatino Linotype', family: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
    { id: 'cambria', label: 'Cambria', family: 'Cambria, Georgia, serif' },
    { id: 'segoe', label: 'Segoe UI', family: '"Segoe UI", Tahoma, sans-serif' },
  ]
  const readSettings = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      return {
        palette: palettes.some((item) => item.id === saved.palette) ? saved.palette : 'forest',
        font: fonts.some((item) => item.id === saved.font) ? saved.font : 'system',
        pop: saved.pop !== false,
        neon: saved.neon === true,
        white: saved.white === true,
        paletteChosen: saved.paletteChosen === true || (!Object.prototype.hasOwnProperty.call(saved, 'paletteChosen') && Object.prototype.hasOwnProperty.call(saved, 'palette')),
      }
    } catch { return { palette: 'forest', font: 'system', pop: true, neon: false } }
  }
  let preferences = readSettings()
  const applySettings = () => {
    document.documentElement.dataset.lifexpPalette = preferences.palette
    document.documentElement.dataset.lifexpPop = preferences.pop ? 'on' : 'off'
    document.documentElement.dataset.lifexpNeon = preferences.neon ? 'on' : 'off'
    document.documentElement.dataset.lifexpWhite = preferences.white ? 'on' : 'off'
    document.documentElement.style.setProperty('--lifexp-font', fonts.find((item) => item.id === preferences.font)?.family || fonts[0].family)
    const browserTheme = document.querySelector('meta[name="theme-color"]')
    if (browserTheme) browserTheme.content = preferences.neon ? '#020106' : preferences.white ? '#f3f6f4' : '#07110c'
  }
  const saveSettings = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)) } catch { /* Keep the current session usable if storage is unavailable. */ }
    applySettings()
  }
  applySettings()

  const renderSettings = (section = 'home') => {
    document.querySelector('[data-settings-backdrop]')?.remove()
    const overlay = document.createElement('div')
    overlay.className = 'modal-backdrop settings-backdrop'
    overlay.dataset.settingsBackdrop = 'true'
    overlay.innerHTML = '<div class="modal-card settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" tabindex="-1"><button class="modal-close settings-close" type="button" aria-label="Close settings">×</button><div class="settings-content"></div></div>'
    const card = overlay.querySelector('.settings-modal')
    const content = overlay.querySelector('.settings-content')
    const close = () => { overlay.remove(); document.body.style.overflow = ''; document.querySelector('.settings-menu-button')?.focus() }
    const openSection = (next) => { renderSettings(next) }

    if (section === 'home') {
      content.innerHTML = `
        <div class="settings-kicker">⚙ &nbsp; LIFE XP SETTINGS</div>
        <h2 class="settings-title" id="settings-title">Settings</h2>
        <p class="settings-subtitle">Shape how LifeXP looks or start your adventure over.</p>
        <div class="settings-options">
          <button class="settings-option" type="button" data-open="customization"><span class="settings-option-icon">✦</span><span><strong>Customization</strong><small>Choose a background palette and font for your dashboard.</small></span></button>
          <button class="settings-option reset-option" type="button" data-open="reset"><span class="settings-option-icon">↻</span><span><strong>Profile reset</strong><small>Clear your profile, quests, habits, and progress.</small></span></button>
        </div>
        <div class="settings-footer"><button class="secondary-button" type="button" data-close>Done</button></div>`
    } else if (section === 'customization') {
      const selectedFont = fonts.find((item) => item.id === preferences.font) || fonts[0]
      content.innerHTML = `
        <button class="settings-back" type="button" data-open="home">‹ &nbsp; Back to settings</button>
        <div class="settings-kicker">✦ &nbsp; CUSTOMIZATION</div>
        <h2 class="settings-title" id="settings-title">Make LifeXP yours</h2>
        <p class="settings-subtitle">Your choices save automatically on this device.</p>
        <div class="neon-setting"><div><strong>Neon mode</strong><small>Black glass surfaces with neon edges and glow. Your palette sets the neon color.</small></div><button class="settings-switch neon-mode-switch ${preferences.neon ? 'is-on' : ''}" type="button" role="switch" aria-label="Neon mode" aria-checked="${preferences.neon}" data-toggle-neon><span>${preferences.neon ? 'On' : 'Off'}</span><i></i></button></div>
        <div class="neon-setting white-setting"><div><strong>White mode</strong><small>Light surfaces and dark text. Your palette sets the accent color.</small></div><button class="settings-switch white-mode-switch ${preferences.white ? 'is-on' : ''}" type="button" role="switch" aria-label="White mode" aria-checked="${preferences.white}" data-toggle-white><span>${preferences.white ? 'On' : 'Off'}</span><i></i></button></div>
        <span class="settings-section-label" data-palette-label>${preferences.neon ? 'NEON COLOR' : preferences.white ? 'ACCENT COLOR' : 'BACKGROUND PALETTE'}</span>
        <p class="settings-palette-hint" data-palette-hint>${preferences.neon ? 'Choose the glow color for your black neon theme.' : preferences.white ? 'Choose the accent color for your light theme.' : 'Choose the color mood for your dashboard.'}</p>
        <div class="palette-grid" role="radiogroup" aria-label="${preferences.neon ? 'Neon color' : preferences.white ? 'Accent color' : 'Background color palette'}">${palettes.map((item) => `<button class="palette-choice" type="button" role="radio" aria-checked="${preferences.palette === item.id}" data-palette="${item.id}"><span class="palette-swatch" style="background:${item.swatch}"></span><strong>${preferences.neon ? item.neonLabel : item.label}</strong></button>`).join('')}</div>
        <label class="settings-section-label" for="settings-font">FONT FAMILY · 10 ALTERNATIVES</label>
        <select class="settings-font-select" id="settings-font">${fonts.map((item) => `<option value="${item.id}" ${preferences.font === item.id ? 'selected' : ''}>${item.label}${item.id === 'system' ? ' · default' : ''}</option>`).join('')}</select>
        <div class="settings-font-preview" style="font-family:${selectedFont.family}">A quick preview · Small steps, legendary stories.</div>
        <div class="pop-setting"><div><strong>Card pop effect</strong><small>Lift and glow when you point to a card.</small></div><button class="settings-switch ${preferences.pop ? 'is-on' : ''}" type="button" role="switch" aria-label="Card pop effect" aria-checked="${preferences.pop}" data-toggle-pop><span>${preferences.pop ? 'On' : 'Off'}</span><i></i></button></div>
        <div class="settings-footer"><button class="secondary-button" type="button" data-close>Done</button></div>`
    } else {
      content.innerHTML = `
        <button class="settings-back" type="button" data-open="home">‹ &nbsp; Back to settings</button>
        <div class="settings-kicker">↻ &nbsp; PROFILE RESET</div>
        <h2 class="settings-title" id="settings-title">Start a new journey?</h2>
        <p class="settings-subtitle">This will clear the adventurer profile, quests, habits, XP, streaks, achievements, and daily rewards saved in this browser.</p>
        <div class="settings-reset-note"><strong>This cannot be undone.</strong> Your palette, font, display mode, and card effect settings will stay as they are.</div>
        <div class="settings-footer"><button class="secondary-button" type="button" data-open="home">Keep my progress</button><button class="primary-button settings-reset-button" type="button" data-reset>Reset profile</button></div>`
    }

    document.body.append(overlay)
    document.body.style.overflow = 'hidden'
    const refreshAppearanceControls = () => {
      const mode = preferences.neon ? 'neon' : preferences.white ? 'white' : 'dark'
      const labels = { neon: ['NEON COLOR', 'Choose the glow color for your black neon theme.', 'Neon color'], white: ['ACCENT COLOR', 'Choose the accent color for your light theme.', 'Accent color'], dark: ['BACKGROUND PALETTE', 'Choose the color mood for your dashboard.', 'Background color palette'] }
      const [label, hint, ariaLabel] = labels[mode]
      overlay.querySelector('[data-palette-label]').textContent = label
      overlay.querySelector('[data-palette-hint]').textContent = hint
      overlay.querySelector('.palette-grid').setAttribute('aria-label', ariaLabel)
      overlay.querySelectorAll('[data-palette]').forEach((item) => {
        const palette = palettes.find((choice) => choice.id === item.dataset.palette)
        item.setAttribute('aria-checked', String(preferences.palette === palette.id))
        item.querySelector('strong').textContent = preferences.neon ? palette.neonLabel : palette.label
      })
      for (const [selector, active] of [['[data-toggle-neon]', preferences.neon], ['[data-toggle-white]', preferences.white]]) {
        const toggle = overlay.querySelector(selector)
        toggle?.setAttribute('aria-checked', String(active))
        toggle?.classList.toggle('is-on', active)
        const stateText = toggle?.querySelector('span')
        if (stateText) stateText.textContent = active ? 'On' : 'Off'
      }
    }
    const restoreFocus = () => { close() }
    overlay.querySelector('.settings-close').addEventListener('click', restoreFocus)
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close()
      const openButton = event.target.closest('[data-open]')
      if (openButton) openSection(openButton.dataset.open)
      if (event.target.closest('[data-close]')) close()
      const paletteButton = event.target.closest('[data-palette]')
      if (paletteButton) {
        preferences.palette = paletteButton.dataset.palette
        preferences.paletteChosen = true
        saveSettings()
        overlay.querySelectorAll('[data-palette]').forEach((item) => item.setAttribute('aria-checked', String(item === paletteButton)))
      }
      const popButton = event.target.closest('[data-toggle-pop]')
      if (popButton) {
        preferences.pop = !preferences.pop
        saveSettings()
        popButton.setAttribute('aria-checked', String(preferences.pop))
        popButton.classList.toggle('is-on', preferences.pop)
        popButton.querySelector('span').textContent = preferences.pop ? 'On' : 'Off'
      }
      const neonButton = event.target.closest('[data-toggle-neon]')
      if (neonButton) {
        preferences.neon = !preferences.neon
        if (preferences.neon) preferences.white = false
        if (preferences.neon && !preferences.paletteChosen && preferences.palette === 'forest') preferences.palette = 'violet'
        saveSettings()
        refreshAppearanceControls()
      }
      const whiteButton = event.target.closest('[data-toggle-white]')
      if (whiteButton) {
        preferences.white = !preferences.white
        if (preferences.white) preferences.neon = false
        saveSettings()
        refreshAppearanceControls()
      }
      if (event.target.closest('[data-reset]')) {
        GAME_KEYS.forEach((key) => localStorage.removeItem(key))
        location.reload()
      }
    })
    const fontSelect = overlay.querySelector('#settings-font')
    fontSelect?.addEventListener('change', () => {
      preferences.font = fontSelect.value
      saveSettings()
      const option = fonts.find((item) => item.id === preferences.font) || fonts[0]
      const preview = overlay.querySelector('.settings-font-preview')
      preview.style.fontFamily = option.family
    })
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close()
      if (event.key === 'Tab') {
        const controls = [...card.querySelectorAll('button:not(:disabled), select')]
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus() }
      }
    })
    card.focus()
  }

  const installButton = () => {
    const bottom = document.querySelector('.sidebar-bottom')
    if (!bottom || bottom.querySelector('.settings-menu-button')) return
    const button = document.createElement('button')
    button.className = 'nav-item settings-menu-button'
    button.type = 'button'
    button.innerHTML = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.6-1.4-2.4L7.1 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z"/></svg><span>Settings</span>'
    button.addEventListener('click', () => {
      renderSettings()
      document.querySelector('.sidebar-open .mobile-close')?.click()
    })
    bottom.insertBefore(button, bottom.firstChild)
  }
  const observer = new MutationObserver(installButton)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  installButton()
})()

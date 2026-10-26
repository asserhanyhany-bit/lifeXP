(() => {
  const SAVE_KEY = 'lifexp-save-v2'
  let scheduled = false

  const readSave = () => {
    try {
      const value = localStorage.getItem(SAVE_KEY)
      return value ? JSON.parse(value) : null
    } catch {
      return null
    }
  }

  const isFreshStart = (save) => !save || (
    Array.isArray(save.quests) && save.quests.length === 0 &&
    Array.isArray(save.habits) && save.habits.length === 0 &&
    (save.completedCount || 0) === 0
  )
  const setTextIfChanged = (element, value, ignoreWhitespace = false) => {
    if (!element) return
    const current = ignoreWhitespace ? element.textContent.replace(/\s/g, '') : element.textContent
    const next = ignoreWhitespace ? value.replace(/\s/g, '') : value
    if (current !== next) element.textContent = value
  }

  const install = () => {
    scheduled = false
    const content = document.querySelector('.page-content')
    const heading = content?.querySelector('.page-heading')
    const onOverview = document.querySelector('.breadcrumb strong')?.textContent.trim() === 'Overview'
    const existing = content?.querySelector('.lifexp-onboarding')
    const reactOnboarding = content?.querySelector('.first-run-card:not(.lifexp-onboarding)')

    if (!content || !heading || !onOverview || !isFreshStart(readSave())) {
      existing?.remove()
      return
    }

    const questEmpty = content.querySelector('.quests-panel .empty-state')
    if (questEmpty) {
      setTextIfChanged(questEmpty.querySelector('strong'), 'Your quest log is ready')
      setTextIfChanged(questEmpty.querySelector('span'), 'Add one clear next step to get started.')
    }
    const rhythm = content.querySelector('.rhythm-copy')
    if (rhythm) {
      setTextIfChanged(rhythm.querySelector('strong'), 'Start with one small step.', true)
      setTextIfChanged(rhythm.querySelector('span'), 'Add a quest or habit to shape today.')
    }
    if (existing || reactOnboarding) return

    const card = document.createElement('section')
    card.className = 'panel first-run-card lifexp-onboarding'
    card.setAttribute('aria-labelledby', 'first-run-title')
    card.innerHTML = `
      <div class="first-run-intro">
        <div class="first-run-mark" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"/></svg></div>
        <div><div class="eyebrow">A FRESH START</div><h2 id="first-run-title">Choose your first small win</h2><p>Create a quest or a habit. You can change everything later.</p></div>
      </div>
      <div class="first-run-actions">
        <button class="primary-button" type="button" data-start="quest"><span aria-hidden="true">＋</span> Create a quest</button>
        <button class="secondary-button" type="button" data-start="habit"><span aria-hidden="true">✦</span> Add a habit</button>
        <button class="first-run-guide" type="button" data-start="guide">How it works <span aria-hidden="true">→</span></button>
      </div>`

    card.querySelector('[data-start="quest"]').addEventListener('click', () => {
      content.querySelector('.page-heading > .primary-button')?.click()
    })
    card.querySelector('[data-start="habit"]').addEventListener('click', () => {
      content.querySelector('.daily-panel .panel-add')?.click()
    })
    card.querySelector('[data-start="guide"]').addEventListener('click', () => {
      document.querySelector('.guide-menu-item')?.click()
    })
    heading.insertAdjacentElement('afterend', card)
  }

  const queueInstall = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(install)
  }

  const observer = new MutationObserver(queueInstall)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('storage', queueInstall)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (document.querySelector('.search-box')) {
        document.querySelector('.search-box button[aria-label="Close search"]')?.click()
        return
      }
      document.querySelector('.sidebar-open .mobile-close')?.click()
      return
    }
    const target = event.target
    const isTyping = target instanceof HTMLElement && (
      target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    )
    const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'
    const slash = event.key === '/' && !event.ctrlKey && !event.metaKey
    if (isTyping || !(shortcut || slash)) return
    event.preventDefault()
    const search = document.querySelector('.topbar-actions button[title^="Search quests"], .topbar-actions button[aria-label="Search quests"], .topbar-actions button[aria-label="Close search"]')
    if (!document.querySelector('.search-box')) search?.click()
    window.setTimeout(() => document.querySelector('.search-box input')?.focus(), 0)
  })
  queueInstall()
})()

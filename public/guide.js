(() => {
  const install = () => {
    const nav = document.querySelector('.side-nav')
    if (!nav || nav.querySelector('.guide-menu-item')) return

    const button = document.createElement('button')
    button.className = 'nav-item guide-menu-item'
    button.type = 'button'
    button.setAttribute('aria-haspopup', 'dialog')
    button.setAttribute('aria-expanded', 'false')
    button.innerHTML = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18V5a2 2 0 0 1 2-2h4a3 3 0 0 1 3 3 3 3 0 0 1 3-3h4a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1h-5a3 3 0 0 0-3 2 3 3 0 0 0-3-2H4a1 1 0 0 1-1-1Z"/></svg><span>Guide</span>'
    nav.append(button)

    const closeGuide = () => {
      document.querySelector('.guide-backdrop')?.remove()
      button.setAttribute('aria-expanded', 'false')
      document.body.style.overflow = ''
      button.focus()
    }

    button.addEventListener('click', () => {
      if (document.querySelector('.guide-backdrop')) return
      button.setAttribute('aria-expanded', 'true')
      document.body.style.overflow = 'hidden'
      const overlay = document.createElement('div')
      overlay.className = 'guide-backdrop'
      overlay.innerHTML = `
        <section class="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title" tabindex="-1">
          <button class="guide-close" type="button" aria-label="Close guide">×</button>
          <header class="guide-heading">
            <div><div class="eyebrow">YOUR FIELD GUIDE</div><h2 id="guide-title">A quick guide to LifeXP</h2><p>Start small, collect experience, and build a rhythm that fits your real life.</p></div>
          </header>
          <div class="guide-level-note"><span aria-hidden="true">✦</span><div><strong>Your journey starts at level 1 with 0 XP.</strong><span>Create your own quests and habits whenever you’re ready.</span></div></div>
          <div class="guide-grid">
            <article class="guide-step"><div class="guide-step-top"><span class="guide-step-number">01</span><h3>Make a quest</h3></div><p>Open <strong>Quests</strong> or choose <strong>New quest</strong>. Give it a name, category, difficulty, and optional deadline. You can edit or remove it later.</p></article>
            <article class="guide-step"><div class="guide-step-top"><span class="guide-step-number">02</span><h3>Earn XP and level up</h3></div><p>Finish a quest to collect its XP once. Every <strong>500 XP</strong> raises your level.</p><div class="guide-xp-list"><span>Easy · 10 XP</span><span>Medium · 25 XP</span><span>Hard · 50 XP</span><span>Legendary · 100 XP</span></div></article>
            <article class="guide-step"><div class="guide-step-top"><span class="guide-step-number">03</span><h3>Build a habit</h3></div><p>Add habits you want to repeat, then check them off each day. The first check-in for a habit each day grants <strong>10 XP</strong>. Streaks and Week/Month views help you see your consistency.</p></article>
            <article class="guide-step"><div class="guide-step-top"><span class="guide-step-number">04</span><h3>Claim daily bonuses</h3></div><p>Complete <strong>3 quests in one day</strong> to claim a 50 XP challenge bonus. Finish all of today’s quests and habits to claim the 25 XP daily reward. Each bonus is available once per day.</p></article>
            <article class="guide-step"><div class="guide-step-top"><span class="guide-step-number">05</span><h3>Track your story</h3></div><p><strong>Achievements</strong> mark milestones. <strong>Analytics</strong> shows your XP, activity, and category progress. Profile settings let you change your name, title, and avatar.</p></article>
            <article class="guide-step"><div class="guide-step-top"><span class="guide-step-number">06</span><h3>Your data stays here</h3></div><p>Your progress saves automatically in this browser. It remains available when you return to the site on this device.</p></article>
          </div>
          <footer class="guide-footer"><span>You’re in control—there’s no wrong way to begin.</span><button class="primary-button guide-done" type="button">Got it</button></footer>
        </section>`
      document.body.append(overlay)
      overlay.querySelector('.guide-close').focus()
      overlay.addEventListener('click', (event) => { if (event.target === overlay) closeGuide() })
      overlay.querySelector('.guide-close').addEventListener('click', closeGuide)
      overlay.querySelector('.guide-done').addEventListener('click', closeGuide)
      overlay.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeGuide()
        if (event.key === 'Tab') {
          const controls = [...overlay.querySelectorAll('button')]
          if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus() }
          else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus() }
        }
      })
      document.querySelector('.sidebar-open .mobile-close')?.click()
    })
  }

  const observer = new MutationObserver(install)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  install()
})()

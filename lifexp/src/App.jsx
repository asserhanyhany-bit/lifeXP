import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowRight, ArrowUpRight, Award, BookOpen,
  Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  Clock3, Flame, Footprints, Gift, Goal, GraduationCap, Heart, LayoutDashboard,
  ListChecks, LockKeyhole, Menu, MoreHorizontal, Plus, Search, Settings2,
  Shield, Sparkles, Swords, Target, TrendingUp, Trophy, UserRound, Volume2,
  VolumeX, WandSparkles, X, Zap,
} from 'lucide-react'

const STORAGE_KEY = 'lifexp-save-v2'
const LEGACY_STORAGE_KEY = 'lifexp-save-v1'
const categories = ['Academic', 'Fitness', 'Personal Development', 'Productivity']
const difficulties = {
  Easy: { xp: 10, color: 'mint' },
  Medium: { xp: 25, color: 'cyan' },
  Hard: { xp: 50, color: 'violet' },
  Legendary: { xp: 100, color: 'gold' },
}
const categoryIcons = {
  Academic: GraduationCap,
  Fitness: Footprints,
  'Personal Development': Sparkles,
  Productivity: ListChecks,
}

const dateKey = (date = new Date()) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const dateOffset = (offset, base = new Date()) => {
  const d = new Date(base)
  d.setDate(d.getDate() + offset)
  return d
}
const shortDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })
const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

function seedGame() {
  return {
    profile: { name: 'Adventurer', title: 'New Journey', avatar: '🧙', xp: 0 },
    sound: false,
    completedCount: 0,
    completedByCategory: { Academic: 0, Fitness: 0, 'Personal Development': 0, Productivity: 0 },
    quests: [],
    habits: [],
    dailyXp: [],
    habitXpClaims: [],
    claimedChallenge: '',
    claimedDailyReward: '',
  }
}

function loadGame() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return seedGame()
    const parsed = JSON.parse(stored)
    if (!parsed?.profile || !Array.isArray(parsed.quests) || !Array.isArray(parsed.habits)) return seedGame()
    return { ...seedGame(), ...parsed, profile: { ...seedGame().profile, ...parsed.profile } }
  } catch {
    return seedGame()
  }
}

function levelInfo(xp) {
  const level = Math.floor(xp / 500) + 1
  return { level, current: xp % 500, remaining: 500 - (xp % 500), percent: (xp % 500) / 5 }
}

function getStreak(logs = {}) {
  let streak = 0
  let cursor = new Date()
  if (!logs[dateKey(cursor)]) cursor = dateOffset(-1, cursor)
  while (logs[dateKey(cursor)]) {
    streak += 1
    cursor = dateOffset(-1, cursor)
    if (streak > 365) break
  }
  return streak
}

function IconButton({ title, onClick, children, className = '' }) {
  return <button className={`icon-button ${className}`} title={title} aria-label={title} onClick={onClick}>{children}</button>
}

function App() {
  const [game, setGame] = useState(loadGame)
  const [page, setPage] = useState('Overview')
  const [questFilter, setQuestFilter] = useState('All quests')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [habitPeriod, setHabitPeriod] = useState('Week')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [levelUp, setLevelUp] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [monthShift, setMonthShift] = useState(0)
  const [achievementFilter, setAchievementFilter] = useState('All')
  const toastTimer = useRef(null)
  const today = dateKey()
  const level = levelInfo(game.profile.xp)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
  }, [game])

  useEffect(() => {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  }, [])

  const notice = (message, icon = '✨') => {
    setToast({ message, icon })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const playTone = (frequency = 660) => {
    if (!game.sound) return
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      const context = new AudioContextClass()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.055, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.2)
      oscillator.onended = () => context.close()
    } catch { /* audio is an optional enhancement */ }
  }

  const awardXp = (amount) => {
    const oldLevel = levelInfo(game.profile.xp).level
    setGame((prev) => {
      const nextXp = prev.profile.xp + amount
      const key = dateKey()
      const rows = [...prev.dailyXp]
      const existing = rows.find((entry) => entry.date === key)
      if (existing) existing.xp += amount
      else rows.push({ date: key, xp: amount })
      return { ...prev, profile: { ...prev.profile, xp: nextXp }, dailyXp: rows.slice(-35) }
    })
    if (levelInfo(game.profile.xp + amount).level > oldLevel) {
      setLevelUp(true)
      setTimeout(() => setLevelUp(false), 2600)
      notice('Level up! A new chapter begins.', '🌟')
      playTone(880)
    } else {
      notice(`+${amount} XP added to your journey`, '⚡')
      playTone(660)
    }
  }

  const completeQuest = (id) => {
    const quest = game.quests.find((item) => item.id === id)
    if (!quest || quest.status === 'completed') return
    const xp = difficulties[quest.difficulty]?.xp ?? 10
    setGame((prev) => ({
      ...prev,
      completedCount: prev.completedCount + 1,
      completedByCategory: { ...prev.completedByCategory, [quest.category]: (prev.completedByCategory?.[quest.category] ?? 0) + 1 },
      quests: prev.quests.map((item) => item.id === id ? { ...item, status: 'completed', completedAt: today } : item),
    }))
    awardXp(xp)
  }

  const toggleHabit = (id) => {
    const habit = game.habits.find((item) => item.id === id)
    if (!habit) return
    const wasDone = Boolean(habit.logs?.[today])
    const rewardKey = `${id}:${today}`
    const alreadyRewarded = game.habitXpClaims?.includes(rewardKey)
    setGame((prev) => ({
      ...prev,
      habitXpClaims: !wasDone && !alreadyRewarded ? [...(prev.habitXpClaims ?? []), rewardKey] : prev.habitXpClaims,
      habits: prev.habits.map((item) => item.id !== id ? item : {
        ...item,
        logs: { ...item.logs, ...(wasDone ? { [today]: false } : { [today]: true }) },
      }),
    }))
    if (!wasDone && !alreadyRewarded) {
      awardXp(10)
    } else if (!wasDone) {
      notice('Habit checked in again · XP already earned today', '🌱')
    } else {
      notice('Habit unchecked for today', '↩️')
    }
  }

  const saveQuest = (data) => {
    if (modal?.type === 'editQuest') {
      setGame((prev) => ({ ...prev, quests: prev.quests.map((item) => item.id === modal.id ? { ...item, ...data } : item) }))
      notice('Quest updated', '🛠️')
    } else {
      setGame((prev) => ({ ...prev, quests: [{ id: uid(), ...data, status: 'active' }, ...prev.quests] }))
      notice('Quest added to your log', '🗺️')
    }
    setModal(null)
  }

  const removeQuest = (id) => {
    setGame((prev) => ({ ...prev, quests: prev.quests.filter((quest) => quest.id !== id) }))
    setModal(null)
    notice('Quest removed', '🗑️')
  }

  const saveHabit = (data) => {
    if (modal?.type === 'editHabit') {
      setGame((prev) => ({ ...prev, habits: prev.habits.map((habit) => habit.id === modal.id ? { ...habit, ...data } : habit) }))
      notice('Habit updated', '🛠️')
    } else {
      setGame((prev) => ({ ...prev, habits: [...prev.habits, { id: uid(), ...data, logs: {} }] }))
      notice('Habit added to your routine', '🌱')
    }
    setModal(null)
  }

  const removeHabit = (id) => {
    setGame((prev) => ({ ...prev, habits: prev.habits.filter((habit) => habit.id !== id) }))
    setModal(null)
    notice('Habit removed', '🗑️')
  }

  const saveProfile = (data) => {
    setGame((prev) => ({ ...prev, profile: { ...prev.profile, ...data } }))
    setModal(null)
    notice('Profile saved', '🛡️')
  }

  const claimChallenge = () => {
    const count = game.quests.filter((quest) => quest.completedAt === today).length
    if (count < 3 || game.claimedChallenge === today) return
    setGame((prev) => ({ ...prev, claimedChallenge: today }))
    awardXp(50)
    notice('Daily challenge cleared!', '🏆')
  }

  const todayQuests = game.quests.filter((quest) => quest.dueDate === today || quest.completedAt === today)
  const doneTodayQuests = todayQuests.filter((quest) => quest.status === 'completed').length
  const habitsDone = game.habits.filter((habit) => habit.logs?.[today]).length
  const dailyTotal = todayQuests.length + game.habits.length
  const dailyPercent = dailyTotal ? Math.round(((doneTodayQuests + habitsDone) / dailyTotal) * 100) : 0
  const challengeProgress = game.quests.filter((quest) => quest.completedAt === today).length

  const achievements = useMemo(() => {
    const allDone = game.completedCount
    const bestStreak = Math.max(0, ...game.habits.map((habit) => getStreak(habit.logs)))
    const definitions = [
      { id: 'first', name: 'First Steps', desc: 'Complete your first quest', icon: Footprints, tone: 'cyan', unlocked: allDone > 0, reward: '25 XP' },
      { id: 'level3', name: 'Rising Star', desc: 'Reach level 3', icon: Sparkles, tone: 'violet', unlocked: level.level >= 3, reward: 'Aura · Violet' },
      { id: 'streak7', name: 'Unbroken', desc: 'Build a 7-day habit streak', icon: Flame, tone: 'gold', unlocked: bestStreak >= 7, reward: '50 XP' },
      { id: 'planner', name: 'Master Planner', desc: 'Complete 10 productivity quests', icon: Goal, tone: 'mint', unlocked: (game.completedByCategory?.Productivity ?? game.quests.filter((q) => q.category === 'Productivity' && q.status === 'completed').length) >= 10, reward: 'Planner frame' },
      { id: 'century', name: 'Century Club', desc: 'Earn 1000 XP', icon: Zap, tone: 'gold', unlocked: game.profile.xp >= 1000, reward: '100 XP' },
      { id: 'wellrounded', name: 'Well Rounded', desc: 'Track 4 different habits', icon: Heart, tone: 'pink', unlocked: game.habits.length >= 4, reward: 'Rest day token' },
      { id: 'legend', name: 'Mythmaker', desc: 'Complete a legendary quest', icon: Shield, tone: 'violet', unlocked: game.quests.some((q) => q.difficulty === 'Legendary' && q.status === 'completed'), reward: 'Mythic title' },
      { id: 'bookworm', name: 'Lorekeeper', desc: 'Complete 5 academic quests', icon: BookOpen, tone: 'cyan', unlocked: (game.completedByCategory?.Academic ?? game.quests.filter((q) => q.category === 'Academic' && q.status === 'completed').length) >= 5, reward: 'Bookish avatar' },
    ]
    return definitions
  }, [game, level.level])
  const unlockedAchievements = achievements.filter((item) => item.unlocked).length

  const filteredQuests = game.quests.filter((quest) => {
    const statusMatches = questFilter === 'All quests' || (questFilter === 'Active' ? quest.status === 'active' : quest.status === 'completed')
    const categoryMatches = categoryFilter === 'All' || quest.category === categoryFilter
    const searchMatches = !searchText || quest.title.toLowerCase().includes(searchText.toLowerCase())
    return statusMatches && categoryMatches && searchMatches
  }).sort((a, b) => (a.status === b.status ? (a.dueDate || '').localeCompare(b.dueDate || '') : a.status === 'active' ? -1 : 1))

  const navItems = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Quests', icon: Swords },
    { name: 'Habits', icon: Activity },
    { name: 'Achievements', icon: Trophy },
    { name: 'Analytics', icon: TrendingUp },
  ]

  const goTo = (name) => {
    setPage(name)
    setMobileNav(false)
    setSearchText('')
  }

  const toggleSound = () => {
    setGame((prev) => ({ ...prev, sound: !prev.sound }))
    notice(game.sound ? 'Sound effects off' : 'Sound effects on', game.sound ? '🔇' : '🔊')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><span>✦</span></div>
          <div className="brand-name">life<span>xp</span><small>REAL LIFE. EPIC QUEST.</small></div>
          <IconButton title="Close navigation" className="mobile-close" onClick={() => setMobileNav(false)}><X size={18} /></IconButton>
        </div>
        <div className="guild-card">
          <div className="guild-icon"><Shield size={17} /></div>
          <div><span className="eyebrow">YOUR GUILD</span><strong>Wayfinder's Path</strong></div>
          <ChevronDown size={14} className="muted" />
        </div>
        <div className="nav-label">MENU</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ name, icon: Icon }) => (
            <button key={name} className={`nav-item ${page === name ? 'active' : ''}`} onClick={() => goTo(name)}>
              <Icon size={18} strokeWidth={1.8} /><span>{name}</span>{name === 'Quests' && <span className="nav-count">{game.quests.filter((q) => q.status === 'active').length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-quest-card">
          <div className="quest-card-orb"><WandSparkles size={20} /></div>
          <p className="eyebrow">TODAY'S CHALLENGE</p>
          <strong>Make today<br />count.</strong>
          <div className="mini-progress"><i style={{ width: `${Math.min(challengeProgress / 3 * 100, 100)}%` }} /></div>
          <small>{Math.min(challengeProgress, 3)} of 3 quests complete</small>
          <button className="text-link" onClick={() => goTo('Overview')}>View challenge <ArrowRight size={13} /></button>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setModal({ type: 'profile' })}><Settings2 size={18} /><span>Profile settings</span></button>
          <div className="sidebar-user" onClick={() => setModal({ type: 'profile' })} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setModal({ type: 'profile' })}>
            <div className="avatar small-avatar">{game.profile.avatar}</div>
            <div className="sidebar-user-text"><strong>{game.profile.name}</strong><span>Level {level.level} Adventurer</span></div>
            <MoreHorizontal size={19} className="muted" />
          </div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton title="Open navigation" className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20} /></IconButton>
            <div className="breadcrumb"><span>LifeXP</span><ChevronRight size={14} /><strong>{page}</strong></div>
          </div>
          <div className="topbar-actions">
            {searchOpen && <div className="search-box"><Search size={15} /><input autoFocus value={searchText} onChange={(e) => { setSearchText(e.target.value); if (page !== 'Quests') setPage('Quests') }} placeholder="Search quests..." /><button onClick={() => { setSearchOpen(false); setSearchText('') }} aria-label="Close search"><X size={14} /></button></div>}
            <IconButton title={searchOpen ? 'Close search' : 'Search quests · / or Ctrl K'} onClick={() => setSearchOpen(!searchOpen)}><Search size={18} /></IconButton>
            <IconButton title={game.sound ? 'Turn sound off' : 'Turn sound on'} onClick={toggleSound}>{game.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</IconButton>
            <span className="topbar-divider" />
            <button className="top-user" onClick={() => setModal({ type: 'profile' })}>
              <div className="avatar top-avatar">{game.profile.avatar}</div><div><strong>{game.profile.name}</strong><span>LVL {String(level.level).padStart(2, '0')}</span></div><ChevronDown size={14} />
            </button>
          </div>
        </header>

        <div className="page-content">
          {page === 'Overview' && <Overview
            game={game} level={level} today={today} dailyPercent={dailyPercent} todayQuests={todayQuests} doneTodayQuests={doneTodayQuests}
            habitsDone={habitsDone} challengeProgress={challengeProgress} onComplete={completeQuest} onToggleHabit={toggleHabit} onGo={goTo}
            onNewQuest={() => setModal({ type: 'newQuest' })} onNewHabit={() => setModal({ type: 'newHabit' })} onClaimChallenge={claimChallenge}
            achievements={achievements} onOpenGuide={() => document.querySelector('.guide-menu-item')?.click()} onClaimDaily={() => {
              if (dailyPercent < 100 || game.claimedDailyReward === today) return
              setGame((prev) => ({ ...prev, claimedDailyReward: today }))
              awardXp(25)
              notice('Daily reward claimed!', '🎁')
            }}
          />}
          {page === 'Quests' && <QuestsPage
            quests={filteredQuests} filter={questFilter} setFilter={setQuestFilter} category={categoryFilter} setCategory={setCategoryFilter}
            onNew={() => setModal({ type: 'newQuest' })} onComplete={completeQuest} onEdit={(id) => setModal({ type: 'editQuest', id })}
            onDelete={removeQuest} searchText={searchText} onClearSearch={() => { setSearchText(''); setSearchOpen(false) }}
          />}
          {page === 'Habits' && <HabitsPage habits={game.habits} period={habitPeriod} setPeriod={setHabitPeriod} monthShift={monthShift} setMonthShift={setMonthShift}
            onToggle={toggleHabit} onNew={() => setModal({ type: 'newHabit' })} onEdit={(id) => setModal({ type: 'editHabit', id })} onDelete={removeHabit} />}
          {page === 'Achievements' && <AchievementsPage achievements={achievements} completed={game.completedCount} xp={game.profile.xp} filter={achievementFilter} setFilter={setAchievementFilter} />}
          {page === 'Analytics' && <AnalyticsPage game={game} level={level} habitsDone={habitsDone} dailyPercent={dailyPercent} />}
          <footer className="footer"><span>© 2025 LifeXP</span><span>Small steps. Legendary stories.</span><button onClick={() => notice('Keep showing up. That is the whole secret.', '💜')}><CircleHelp size={14} /> Need a little magic?</button></footer>
        </div>
      </main>

      {modal && <ModalLayer modal={modal} game={game} onClose={() => setModal(null)} onSaveQuest={saveQuest} onSaveHabit={saveHabit} onSaveProfile={saveProfile} onDeleteQuest={removeQuest} onDeleteHabit={removeHabit} />}
      {toast && <div className="toast"><span>{toast.icon}</span>{toast.message}<button onClick={() => setToast(null)} aria-label="Dismiss"><X size={14} /></button></div>}
      {levelUp && <div className="levelup-overlay"><div className="levelup-card"><div className="levelup-spark">✦</div><span className="eyebrow">A NEW CHAPTER BEGINS</span><strong>LEVEL UP!</strong><p>You are now level {level.level}</p><button className="primary-button" onClick={() => setLevelUp(false)}>Keep going <ArrowRight size={15} /></button></div></div>}
    </div>
  )
}

function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div><div className="eyebrow heading-eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>
}

function StatCard({ icon: Icon, label, value, note, tone = 'violet', trend }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{trend && <i className="trend"><ArrowUpRight size={12} />{trend}</i>}{note}</small></div><ArrowUpRight className="stat-corner" size={15} /></div>
}

function Overview({ game, level, today, dailyPercent, todayQuests, doneTodayQuests, habitsDone, challengeProgress, onComplete, onToggleHabit, onGo, onNewQuest, onNewHabit, onClaimChallenge, achievements, onClaimDaily, onOpenGuide }) {
  const activeQuests = todayQuests.filter((q) => q.status === 'active').slice(0, 3)
  const todaysHabits = game.habits.slice(0, 4)
  const isFreshStart = game.quests.length === 0 && game.habits.length === 0 && game.completedCount === 0
  const dailyAvailable = dailyPercent === 100 && game.claimedDailyReward !== today
  const monthDay = new Date().toLocaleDateString('en', { month: 'long', day: 'numeric' })
  const dayName = new Date().toLocaleDateString('en', { weekday: 'long' })
  return <>
    <PageHeading eyebrow={`${dayName.toUpperCase()}, ${monthDay.toUpperCase()}`} title={`Welcome back, ${game.profile.name.split(' ')[0]} 👋`} subtitle="Your next great story starts with what you do today." action={<button className="primary-button" onClick={onNewQuest}><Plus size={16} /> New quest</button>} />
    {isFreshStart && <section className="panel first-run-card" aria-labelledby="first-run-title">
      <div className="first-run-intro"><div className="first-run-mark"><Sparkles size={18} /></div><div><div className="eyebrow">A FRESH START</div><h2 id="first-run-title">Choose your first small win</h2><p>Create a quest or a habit. You can change everything later.</p></div></div>
      <div className="first-run-actions"><button className="primary-button" onClick={onNewQuest}><Plus size={15} /> Create a quest</button><button className="secondary-button" onClick={onNewHabit}><Activity size={15} /> Add a habit</button><button className="first-run-guide" onClick={onOpenGuide}>How it works <ArrowRight size={14} /></button></div>
    </section>}
    <section className="hero-panel">
      <div className="hero-grid" />
      <div className="hero-copy"><div className="rank-pill"><span className="rank-dot" /> {game.profile.title} <span className="rank-sep">/</span> RANK {String(level.level).padStart(2, '0')}</div><h2>Every day is a<br /><em>chance to level up.</em></h2><p>Keep your streak alive. Your future self is already cheering.</p>
        <div className="hero-xp-row"><div className="xp-line"><div className="xp-line-head"><span>EXPERIENCE</span><strong>{level.current} <small>/ 500 XP</small></strong></div><div className="xp-track"><i style={{ width: `${level.percent}%` }} /></div><div className="xp-under"><span>LEVEL {String(level.level).padStart(2, '0')}</span><span>{level.remaining} XP to level {level.level + 1}</span></div></div><div className="level-emblem"><span>✦</span><small>LVL</small><strong>{String(level.level).padStart(2, '0')}</strong></div></div>
      </div>
      <div className="hero-art"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-crystal">✧</div><div className="hero-star star-a">✦</div><div className="hero-star star-b">✧</div><div className="hero-star star-c">✦</div><div className="hero-reward"><div><Zap size={16} /></div><span>XP earned<br /><strong>{game.profile.xp.toLocaleString()} total</strong></span><ArrowUpRight size={14} /></div></div>
      <div className="hero-side-label">YOUR JOURNEY · SEASON 01</div>
    </section>
    <section className="stats-grid">
      <StatCard icon={Zap} label="TOTAL EXPERIENCE" value={game.profile.xp.toLocaleString()} note="XP across your journey" tone="violet" />
      <StatCard icon={Flame} label="CURRENT STREAK" value={`${Math.max(0, ...game.habits.map((h) => getStreak(h.logs)))} days`} note="Days in a row" tone="gold" trend="On fire " />
      <StatCard icon={Target} label="TODAY'S PROGRESS" value={`${dailyPercent}%`} note={`${doneTodayQuests + habitsDone} of ${todayQuests.length + game.habits.length} actions`} tone="cyan" />
      <StatCard icon={Trophy} label="QUESTS CLEARED" value={game.completedCount.toLocaleString()} note="Your story so far" tone="mint" />
    </section>
    <div className="dashboard-grid">
      <section className="panel quests-panel"><div className="panel-head"><div><div className="eyebrow">YOUR DAILY ADVENTURE</div><h3>Today's quests <span className="count-badge">{todayQuests.length}</span></h3></div><button className="small-link" onClick={() => onGo('Quests')}>View all <ArrowRight size={14} /></button></div>
        {activeQuests.length > 0 ? <div className="quest-list">{activeQuests.map((quest) => <QuestRow key={quest.id} quest={quest} onComplete={onComplete} compact />)}</div> : todayQuests.length > 0 ? <EmptyState icon={CheckCircle2} title="All today's quests are clear" detail="Take a breath or add another quest." /> : game.quests.length > 0 ? <EmptyState icon={Swords} title="Nothing planned for today" detail="Add a quest for today whenever you're ready." /> : <EmptyState icon={Swords} title="Your quest log is ready" detail="Add one clear next step to get started." />}
        <button className="panel-add" onClick={onNewQuest}><Plus size={15} /> Add a quest to today</button>
      </section>
      <section className="panel daily-panel"><div className="panel-head"><div><div className="eyebrow">A LITTLE EVERY DAY</div><h3>Daily rhythm</h3></div><button className="small-link" onClick={() => onGo('Habits')}>Manage <ArrowRight size={14} /></button></div>
        <div className="daily-rhythm"><div className="ring-wrap"><svg viewBox="0 0 120 120" className="progress-ring"><circle cx="60" cy="60" r="49" className="ring-bg" /><circle cx="60" cy="60" r="49" className="ring-value" style={{ strokeDasharray: `${dailyPercent * 3.08} 308` }} /></svg><div className="ring-center"><strong>{dailyPercent}%</strong><span>COMPLETE</span></div></div><div className="rhythm-copy"><strong>{todayQuests.length + game.habits.length === 0 ? <>Start with one small<br />step.</> : <>You're building<br />momentum.</>}</strong><span>{todayQuests.length + game.habits.length === 0 ? 'Add a quest or habit to shape today' : `${doneTodayQuests + habitsDone} actions complete today`}</span><div className="rhythm-tags"><span><Swords size={12} /> {doneTodayQuests}/{todayQuests.length} quests</span><span><Activity size={12} /> {habitsDone}/{game.habits.length} habits</span></div></div></div>
        <div className="habit-short-list">{todaysHabits.map((habit) => <HabitCheckRow key={habit.id} habit={habit} onToggle={onToggleHabit} />)}</div><button className="panel-add" onClick={onNewHabit}><Plus size={15} /> Create a new habit</button>
      </section>
      <section className="panel challenge-panel"><div className="challenge-art"><div className="challenge-halo" /><div className="challenge-cup">✦</div><div className="challenge-star a">✦</div><div className="challenge-star b">✧</div></div><div className="challenge-copy"><div className="eyebrow">DAILY CHALLENGE <span className="challenge-timer"><Clock3 size={11} /> RESETS AT MIDNIGHT</span></div><h3>Clear the path</h3><p>Complete 3 quests today to earn a little extra magic.</p><div className="challenge-bottom"><div className="challenge-progress"><div><span>PROGRESS</span><strong>{Math.min(challengeProgress, 3)}<small> / 3</small></strong></div><div className="mini-progress"><i style={{ width: `${Math.min(challengeProgress / 3 * 100, 100)}%` }} /></div></div><div className="challenge-reward"><Zap size={14} /> 50 XP</div></div>{game.claimedChallenge === today ? <span className="claimed-label"><Check size={14} /> Reward claimed</span> : <button className="challenge-claim" disabled={challengeProgress < 3} onClick={onClaimChallenge}>{challengeProgress < 3 ? 'Keep going' : 'Claim reward'} <ArrowRight size={14} /></button>}</div></section>
      <section className="panel reward-panel"><div className="panel-head"><div><div className="eyebrow">SHOW UP FOR YOURSELF</div><h3>Daily reward</h3></div><div className="reward-icon"><Gift size={18} /></div></div><div className="reward-body"><div className="reward-medal">🎁</div><div><strong>Consistency chest</strong><span>Finish every action to claim today's reward.</span></div></div><div className="reward-footer"><span><Sparkles size={13} /> +25 XP bonus</span>{game.claimedDailyReward === today ? <span className="claimed-label"><Check size={14} /> Claimed</span> : <button className="claim-button" disabled={!dailyAvailable} onClick={onClaimDaily}>{dailyAvailable ? 'Claim' : `${dailyPercent}%`}</button>}</div></section>
      <section className="panel achievement-preview"><div className="panel-head"><div><div className="eyebrow">MILESTONES</div><h3>Recent achievements</h3></div><button className="small-link" onClick={() => onGo('Achievements')}>See all <ArrowRight size={14} /></button></div><div className="achievement-row">{achievements.filter((a) => a.unlocked).slice(0, 3).map((item) => <AchievementBadge key={item.id} item={item} />)}{unlockedEmpty(achievements) && <span className="muted small-note">Your next milestone is waiting.</span>}</div><div className="achievement-progress-line"><span>{achievements.filter((a) => a.unlocked).length} of {achievements.length} unlocked</span><div className="mini-progress"><i style={{ width: `${achievements.filter((a) => a.unlocked).length / achievements.length * 100}%` }} /></div></div></section>
    </div>
  </>
}

function unlockedEmpty(achievements) { return !achievements.some((a) => a.unlocked) }

function QuestRow({ quest, onComplete, onEdit, onDelete, compact = false }) {
  const Icon = categoryIcons[quest.category] || ListChecks
  const done = quest.status === 'completed'
  return <div className={`quest-row ${done ? 'quest-done' : ''} ${compact ? 'compact' : ''}`}>
    <button className={`quest-check ${done ? 'checked' : ''}`} aria-label={done ? 'Quest completed' : `Complete ${quest.title}`} disabled={done} onClick={() => onComplete(quest.id)}>{done && <Check size={13} />}</button>
    <div className={`quest-type-icon ${quest.category === 'Academic' ? 'cyan' : quest.category === 'Fitness' ? 'mint' : quest.category === 'Productivity' ? 'gold' : 'violet'}`}><Icon size={17} /></div>
    <div className="quest-main"><strong>{quest.title}</strong><div className="quest-meta"><span>{quest.category}</span><i /> <span className={`difficulty ${difficulties[quest.difficulty]?.color}`}>{quest.difficulty}</span>{quest.dueDate && <><i /><span>{done ? 'Completed' : dueDateLabel(quest.dueDate)}</span></>}</div></div>
    <div className="quest-xp"><Zap size={12} /> +{difficulties[quest.difficulty]?.xp ?? 10}<small>XP</small></div>
    {(onEdit || onDelete) && <div className="quest-actions">{onEdit && <IconButton title="Edit quest" onClick={() => onEdit(quest.id)}><Settings2 size={15} /></IconButton>}{onDelete && <IconButton title="Delete quest" onClick={() => onDelete(quest.id)}><X size={15} /></IconButton>}</div>}
  </div>
}

function dueDateLabel(value) {
  if (value === dateKey()) return 'Today'
  if (value === dateKey(dateOffset(1))) return 'Tomorrow'
  if (value < dateKey()) return 'Overdue'
  return shortDate(value)
}

function HabitCheckRow({ habit, onToggle }) {
  const done = Boolean(habit.logs?.[dateKey()])
  return <div className="habit-check-row"><div className="habit-emoji">{habit.icon}</div><div className="habit-check-copy"><strong>{habit.name}</strong><span><Flame size={11} /> {getStreak(habit.logs)} day streak</span></div><button className={`habit-toggle ${done ? 'done' : ''}`} onClick={() => onToggle(habit.id)} aria-label={done ? `Uncheck ${habit.name}` : `Check ${habit.name}`}>{done ? <Check size={14} /> : <span />}</button></div>
}

function EmptyState({ icon: Icon, title, detail }) {
  return <div className="empty-state"><div><Icon size={22} /></div><strong>{title}</strong><span>{detail}</span></div>
}

function QuestsPage({ quests, filter, setFilter, category, setCategory, onNew, onComplete, onEdit, onDelete, searchText, onClearSearch }) {
  const activeCount = quests.filter((q) => q.status === 'active').length
  const completedCount = quests.filter((q) => q.status === 'completed').length
  return <>
    <PageHeading eyebrow="YOUR ADVENTURE LOG" title="Quest board" subtitle="Turn the things you want to do into progress you can see." action={<button className="primary-button" onClick={onNew}><Plus size={16} /> Create quest</button>} />
    <div className="quest-overview-strip"><div><Swords size={17} /><span>Active quests</span><strong>{activeCount}</strong></div><div><CheckCircle2 size={17} /><span>Completed</span><strong>{completedCount}</strong></div><div><Zap size={17} /><span>XP per quest</span><strong>10–100</strong></div><div className="quest-strip-tip"><Sparkles size={16} /><span>Small quests still count. Keep your momentum.</span></div></div>
    <section className="panel quest-board-panel"><div className="board-toolbar"><div className="filter-tabs">{['All quests', 'Active', 'Completed'].map((tab) => <button key={tab} className={filter === tab ? 'selected' : ''} onClick={() => setFilter(tab)}>{tab}{tab === 'Active' && <b>{activeCount}</b>}</button>)}</div><div className="filter-right"><label className="select-wrap"><span className="sr-only">Filter category</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{categories.map((c) => <option key={c}>{c}</option>)}</select><ChevronDown size={14} /></label></div></div>
      {searchText && <div className="search-results-note">Showing matches for <strong>“{searchText}”</strong><button onClick={onClearSearch}><X size={13} /> Clear</button></div>}
      {quests.length > 0 ? <div className="board-quest-list">{quests.map((quest) => <QuestRow key={quest.id} quest={quest} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} />)}</div> : <EmptyState icon={Search} title="No quests found" detail="Try another filter or create a new quest." />}
      <div className="board-footer"><span>Every quest cleared is a promise kept to yourself.</span><button className="small-link" onClick={onNew}><Plus size={14} /> Add another</button></div>
    </section>
    <div className="difficulty-guide"><div className="eyebrow">XP REWARDS</div><div className="difficulty-items">{Object.entries(difficulties).map(([name, data]) => <div key={name}><span className={`difficulty-dot ${data.color}`} /><span>{name}</span><strong>+{data.xp} XP</strong></div>)}</div></div>
  </>
}

function HabitsPage({ habits, period, setPeriod, monthShift, setMonthShift, onToggle, onNew, onEdit, onDelete }) {
  const monthDate = new Date()
  monthDate.setMonth(monthDate.getMonth() + monthShift)
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const monthLabel = monthDate.toLocaleDateString('en', { month: 'long', year: 'numeric' })
  const monthKeys = Array.from({ length: daysInMonth }, (_, i) => dateKey(new Date(monthDate.getFullYear(), monthDate.getMonth(), i + 1)))
  const currentWeek = Array.from({ length: 7 }, (_, i) => dateKey(dateOffset(i - 6)))
  return <>
    <PageHeading eyebrow="YOUR DAILY RHYTHM" title="Habits that stick" subtitle="Consistency is a superpower. Build it one check-in at a time." action={<button className="primary-button" onClick={onNew}><Plus size={16} /> Add habit</button>} />
    <div className="habit-stats-row"><StatCard icon={Flame} label="BEST STREAK" value={`${Math.max(0, ...habits.map((h) => getStreak(h.logs)))} days`} note="Keep the flame alive" tone="gold" /><StatCard icon={CheckCircle2} label="DONE TODAY" value={`${habits.filter((h) => h.logs?.[dateKey()]).length} / ${habits.length}`} note="Every check-in counts" tone="mint" /><StatCard icon={Activity} label="THIS WEEK" value={`${habits.reduce((n, h) => n + currentWeek.filter((key) => h.logs?.[key]).length, 0)} check-ins`} note="Across your habits" tone="violet" /></div>
    <div className="panel habits-panel"><div className="panel-head"><div><div className="eyebrow">YOUR ROUTINE</div><h3>Habit tracker</h3></div><div className="tracker-controls">{period === 'Month' && <div className="month-switch"><button aria-label="Previous month" onClick={() => setMonthShift(monthShift - 1)}><ChevronLeft size={14} /></button><span>{monthLabel}</span><button aria-label="Next month" onClick={() => setMonthShift(monthShift + 1)}><ChevronRight size={14} /></button></div>}<div className="segmented">{['Week', 'Month'].map((x) => <button key={x} onClick={() => setPeriod(x)} className={period === x ? 'active' : ''}>{x}</button>)}</div></div></div>
      <div className="habit-table-head"><span>HABIT</span><span>{period === 'Week' ? 'LAST 7 DAYS' : monthLabel.toUpperCase()}</span><span>STREAK</span><span>TODAY</span></div>
      {habits.length ? habits.map((habit) => <div className="habit-table-row" key={habit.id}><div className="habit-name"><span className="habit-emoji large">{habit.icon}</span><div><strong>{habit.name}</strong><small>{habit.logs?.[dateKey()] ? 'Checked in today' : 'One small step today'}</small></div></div>
      {period === 'Week' ? <div className="week-dots">{currentWeek.map((key) => <div key={key} className="week-day"><span>{new Date(`${key}T12:00:00`).toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)}</span><i className={`${habit.logs?.[key] ? `filled ${habit.color}` : ''} ${key === dateKey() ? 'is-today' : ''}`}>{habit.logs?.[key] ? <Check size={11} /> : ''}</i></div>)}</div> : <div className="month-dots">{monthKeys.map((key) => <i key={key} title={`${shortDate(key)}${habit.logs?.[key] ? ' · complete' : ''}`} className={`${habit.logs?.[key] ? `filled ${habit.color}` : ''} ${key === dateKey() ? 'is-today' : ''}`} />)}<span>{monthKeys.filter((key) => habit.logs?.[key]).length}/{daysInMonth} days</span></div>}
        <div className="streak-cell"><Flame size={14} /><strong>{getStreak(habit.logs)}</strong><span>days</span></div><button className={`habit-toggle table-toggle ${habit.logs?.[dateKey()] ? 'done' : ''}`} onClick={() => onToggle(habit.id)} aria-label={`Toggle ${habit.name} for today`}>{habit.logs?.[dateKey()] ? <Check size={14} /> : <Plus size={14} />}</button>
        <div className="habit-row-actions"><IconButton title="Edit habit" onClick={() => onEdit(habit.id)}><Settings2 size={14} /></IconButton><IconButton title="Delete habit" onClick={() => onDelete(habit.id)}><X size={14} /></IconButton></div>
      </div>) : <EmptyState icon={Activity} title="Your routine starts here" detail="Add a habit and begin collecting small wins." />}
      <button className="panel-add habit-add-row" onClick={onNew}><Plus size={15} /> Add a habit</button>
    </div>
    <div className="habit-coach"><div className="coach-icon"><Sparkles size={19} /></div><div><strong>Make it easy to begin.</strong><span>Choose habits so small they feel almost effortless. The streak comes from showing up.</span></div><span className="coach-stamp">FIELD NOTE 01</span></div>
  </>
}

function AchievementBadge({ item, large = false }) {
  const Icon = item.icon
  return <div className={`achievement-badge ${item.tone} ${large ? 'large-badge' : ''}`} title={`${item.name}: ${item.desc}`}><div className="badge-shine" /><Icon size={large ? 23 : 18} />{item.unlocked && <span className="badge-check"><Check size={9} /></span>}</div>
}

function AchievementsPage({ achievements, completed, xp, filter, setFilter }) {
  const shown = achievements.filter((a) => filter === 'All' || (filter === 'Unlocked' ? a.unlocked : !a.unlocked))
  const unlocked = achievements.filter((a) => a.unlocked).length
  return <>
    <PageHeading eyebrow="MILESTONES & REWARDS" title="Your legend grows" subtitle="Every small win leaves a mark on your story." />
    <section className="achievement-hero"><div className="achievement-hero-copy"><div className="eyebrow">ADVENTURER'S COLLECTION</div><h2>Proof of your progress.</h2><p>Collect milestones as you build the life you want to live.</p><div className="collection-progress"><div><span>COLLECTION</span><strong>{unlocked} <small>/ {achievements.length} unlocked</small></strong></div><div className="xp-track"><i style={{ width: `${unlocked / achievements.length * 100}%` }} /></div></div></div><div className="achievement-hero-art"><Trophy size={54} /><div className="orbit-ring" /><span>✦</span></div><div className="achievement-hero-stats"><div><strong>{completed}</strong><span>QUESTS CLEARED</span></div><i /><div><strong>{xp.toLocaleString()}</strong><span>TOTAL XP</span></div><i /><div><strong>{unlocked}</strong><span>BADGES EARNED</span></div></div></section>
    <section className="achievement-section"><div className="achievement-section-head"><div><div className="eyebrow">THE COLLECTION</div><h3>Milestones <span className="count-badge">{unlocked} / {achievements.length}</span></h3></div><div className="filter-tabs compact-tabs">{['All', 'Unlocked', 'Locked'].map((x) => <button className={filter === x ? 'selected' : ''} key={x} onClick={() => setFilter(x)}>{x}</button>)}</div></div>
      <div className="achievement-grid">{shown.map((item) => <div className={`achievement-card ${item.unlocked ? 'unlocked' : 'locked'}`} key={item.id}><div className="achievement-card-top"><AchievementBadge item={item} large />{item.unlocked ? <span className="unlocked-tag"><Check size={11} /> UNLOCKED</span> : <LockKeyhole size={15} className="lock-icon" />}</div><h4>{item.name}</h4><p>{item.desc}</p><div className="achievement-reward"><Gift size={13} /><span>Reward: <strong>{item.reward}</strong></span></div></div>)}</div>
    </section>
  </>
}

function AnalyticsPage({ game, level, habitsDone, dailyPercent }) {
  const lastSeven = Array.from({ length: 7 }, (_, i) => dateKey(dateOffset(i - 6)))
  const xpMap = new Map(game.dailyXp.map((item) => [item.date, item.xp]))
  const xpValues = lastSeven.map((key) => xpMap.get(key) || 0)
  const maxXp = Math.max(100, ...xpValues)
  const points = xpValues.map((value, index) => `${30 + index * 80},${145 - (value / maxXp) * 105}`).join(' ')
  const weekLabels = lastSeven.map((key) => new Date(`${key}T12:00:00`).toLocaleDateString('en', { weekday: 'short' }))
  const categoryCounts = categories.map((name, i) => ({ name, count: game.completedByCategory?.[name] ?? game.quests.filter((q) => q.category === name && q.status === 'completed').length, tone: ['cyan', 'mint', 'violet', 'gold'][i] }))
  const totalDone = categoryCounts.reduce((n, item) => n + item.count, 0)
  const categoryHex = { cyan: '#53d7ea', mint: '#7de0b4', violet: '#78c981', gold: '#edc46e' }
  let categoryStop = 0
  const categoryGradient = totalDone ? categoryCounts.map((item) => {
    const start = categoryStop
    categoryStop += item.count / totalDone * 100
    return `${categoryHex[item.tone]} ${start}% ${categoryStop}%`
  }).join(', ') : '#292d3b'
  const levelPercent = level.percent
  return <>
    <PageHeading eyebrow="THE LONG GAME" title="Your growth, in focus" subtitle="A little perspective on how far you've already come." />
    <div className="analytics-kpis"><StatCard icon={Zap} label="TOTAL XP EARNED" value={game.profile.xp.toLocaleString()} note="Across every completed action" tone="violet" /><StatCard icon={TrendingUp} label="CURRENT LEVEL" value={`Level ${level.level}`} note={`${level.remaining} XP until the next`} tone="cyan" /><StatCard icon={Target} label="TODAY'S COMPLETION" value={`${dailyPercent}%`} note={`${habitsDone} habits checked in`} tone="mint" /></div>
    <div className="analytics-grid"><section className="panel chart-panel"><div className="panel-head"><div><div className="eyebrow">CONSISTENCY IN MOTION</div><h3>XP earned this week</h3></div><div className="chart-legend"><i /> XP EARNED</div></div><div className="line-chart-wrap"><div className="chart-y-labels"><span>{maxXp}</span><span>{Math.round(maxXp * .66)}</span><span>{Math.round(maxXp * .33)}</span><span>0</span></div><svg className="line-chart" viewBox="0 0 540 170" preserveAspectRatio="none" role="img" aria-label="XP earned over the last seven days"><defs><linearGradient id="xpArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a47bff" stopOpacity=".25" /><stop offset="100%" stopColor="#a47bff" stopOpacity="0" /></linearGradient></defs>{[40, 75, 110, 145].map((y) => <line key={y} x1="30" x2="510" y1={y} y2={y} className="chart-gridline" />)}<polygon points={`30,145 ${points} 510,145`} fill="url(#xpArea)" /><polyline points={points} className="chart-line" />{xpValues.map((value, i) => <circle key={i} cx={30 + i * 80} cy={145 - (value / maxXp) * 105} r="3.5" className="chart-point"><title>{value} XP</title></circle>)}</svg><div className="chart-x-labels">{weekLabels.map((label, i) => <span key={i}>{label}</span>)}</div></div><div className="chart-insight"><div><Sparkles size={15} /><strong>{xpValues.reduce((a, b) => a + b, 0)} XP</strong> earned in the last 7 days</div><span>Keep your rhythm going</span></div></section>
      <section className="panel category-panel"><div className="panel-head"><div><div className="eyebrow">WHERE YOUR XP GOES</div><h3>Quest categories</h3></div><Sparkles size={17} className="insight-wand" /></div><div className="category-donut-wrap"><div className="category-donut" style={{ background: `conic-gradient(${categoryGradient})` }}><div><strong>{totalDone}</strong><span>QUESTS</span></div></div><div className="category-legend">{categoryCounts.map((item) => <div key={item.name}><i className={`dot ${item.tone}`} /><span>{item.name}</span><strong>{item.count}</strong></div>)}</div></div><div className="category-tip"><Sparkles size={14} /> A balanced life is an epic one.</div></section>
      <section className="panel level-panel"><div className="panel-head"><div><div className="eyebrow">YOUR NEXT MILESTONE</div><h3>Level progression</h3></div><div className="level-mini-shield"><Shield size={18} /><strong>{level.level}</strong></div></div><div className="level-progress-copy"><span>LEVEL {level.level} <i>—</i> LEVEL {level.level + 1}</span><strong>{level.current}<small> / 500 XP</small></strong></div><div className="xp-track big-track"><i style={{ width: `${levelPercent}%` }} /></div><div className="level-track-foot"><span><span className="level-dot current" /> Current level</span><span><span className="level-dot next" /> Next level</span><strong>{level.remaining} XP to go</strong></div><div className="next-rank"><div className="rank-icon"><Award size={18} /></div><div><span>NEXT RANK REWARD</span><strong>{level.level + 1 >= 5 ? 'The Nightwatch Mantle' : 'Violet trail aura'}</strong></div><LockKeyhole size={15} /></div></section>
      <section className="panel insights-panel"><div className="panel-head"><div><div className="eyebrow">A NOTE FROM YOUR JOURNEY</div><h3>Patterns worth keeping</h3></div><WandSparkles size={18} className="insight-wand" /></div><div className="insight-cards"><div><div className="insight-emoji">🌤️</div><strong>Show up, even briefly.</strong><span>Your smallest actions still move your XP forward.</span></div><div><div className="insight-emoji">🧭</div><strong>Make room for every side.</strong><span>Mix learning, movement, and rest as you plan quests.</span></div></div></section></div>
  </>
}

function ModalLayer({ modal, game, onClose, onSaveQuest, onSaveHabit, onSaveProfile, onDeleteQuest, onDeleteHabit }) {
  const quest = modal.id ? game.quests.find((q) => q.id === modal.id) : null
  const habit = modal.id ? game.habits.find((h) => h.id === modal.id) : null
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal-card"><button className="modal-close" onClick={onClose} aria-label="Close modal"><X size={17} /></button>
    {modal.type === 'newQuest' || modal.type === 'editQuest' ? <QuestForm initial={quest} onSave={onSaveQuest} onCancel={onClose} onDelete={quest ? () => onDeleteQuest(quest.id) : undefined} /> : null}
    {modal.type === 'newHabit' || modal.type === 'editHabit' ? <HabitForm initial={habit} onSave={onSaveHabit} onCancel={onClose} onDelete={habit ? () => onDeleteHabit(habit.id) : undefined} /> : null}
    {modal.type === 'profile' ? <ProfileForm profile={game.profile} onSave={onSaveProfile} onCancel={onClose} /> : null}
  </div></div>
}

function QuestForm({ initial, onSave, onCancel, onDelete }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState(initial?.category ?? categories[0])
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 'Medium')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? dateKey())
  const [description, setDescription] = useState(initial?.description ?? '')
  const [error, setError] = useState('')
  const submit = (e) => { e.preventDefault(); if (!title.trim()) return setError('Give your quest a name first.'); onSave({ title: title.trim(), category, difficulty, dueDate, description: description.trim() }) }
  return <><div className="modal-kicker"><Swords size={15} /> QUEST LOG</div><h2>{initial ? 'Edit your quest' : 'Create a quest'}</h2><p className="modal-subtitle">Make your next step clear, doable, and worth celebrating.</p><form onSubmit={submit} className="modal-form"><label>Quest name<input maxLength="70" value={title} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder="e.g. Study for 30 minutes" /></label><div className="form-grid"><label>Category<select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label><label>Difficulty<select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>{Object.keys(difficulties).map((d) => <option key={d}>{d}</option>)}</select></label></div><label>Deadline<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label><label>Notes <span className="optional">OPTIONAL</span><textarea value={description} maxLength="180" onChange={(e) => setDescription(e.target.value)} placeholder="What does done look like?" rows="3" /></label>{error && <span className="form-error">{error}</span>}<div className="form-reward"><Zap size={14} /> Completing this quest earns <strong>+{difficulties[difficulty].xp} XP</strong></div><div className="modal-actions">{onDelete && <button type="button" className="danger-text" onClick={onDelete}>Delete quest</button>}<span className="modal-spacer" /><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="primary-button">{initial ? 'Save changes' : 'Add quest'} <ArrowRight size={15} /></button></div></form></>
}

function HabitForm({ initial, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '🌱')
  const [color, setColor] = useState(initial?.color ?? 'violet')
  const [error, setError] = useState('')
  const icons = ['🌱', '📖', '🏃', '💧', '✍️', '🧘', '🎨', '🧠', '🌙', '🥗']
  const submit = (e) => { e.preventDefault(); if (!name.trim()) return setError('Give your habit a name first.'); onSave({ name: name.trim(), icon, color }) }
  return <><div className="modal-kicker"><Activity size={15} /> DAILY RHYTHM</div><h2>{initial ? 'Edit your habit' : 'Add a habit'}</h2><p className="modal-subtitle">Keep it simple enough to repeat on your busiest day.</p><form onSubmit={submit} className="modal-form"><label>Habit name<input maxLength="45" value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="e.g. Stretch for 5 minutes" /></label><label>Choose an icon</label><div className="emoji-picker">{icons.map((item) => <button type="button" key={item} className={icon === item ? 'selected' : ''} onClick={() => setIcon(item)}>{item}</button>)}</div><label>Accent color</label><div className="color-picker">{['violet', 'cyan', 'mint', 'gold'].map((item) => <button key={item} type="button" aria-label={`${item} accent`} className={`color-choice ${item} ${color === item ? 'selected' : ''}`} onClick={() => setColor(item)} />)}</div>{error && <span className="form-error">{error}</span>}<div className="form-reward"><Zap size={14} /> Checking in earns <strong>+10 XP</strong> the first time each day</div><div className="modal-actions">{onDelete && <button type="button" className="danger-text" onClick={onDelete}>Delete habit</button>}<span className="modal-spacer" /><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="primary-button">{initial ? 'Save changes' : 'Add habit'} <ArrowRight size={15} /></button></div></form></>
}

function ProfileForm({ profile, onSave, onCancel }) {
  const [name, setName] = useState(profile.name)
  const [title, setTitle] = useState(profile.title)
  const [avatar, setAvatar] = useState(profile.avatar)
  const [error, setError] = useState('')
  const submit = (e) => { e.preventDefault(); if (!name.trim()) return setError('Enter a display name to save.'); onSave({ name: name.trim(), title: title.trim() || 'Adventurer', avatar }) }
  return <><div className="modal-kicker"><UserRound size={15} /> PLAYER PROFILE</div><h2>Edit your profile</h2><p className="modal-subtitle">Make your corner of the world feel like yours.</p><form onSubmit={submit} className="modal-form"><label>Display name<input maxLength="35" value={name} onChange={(e) => setName(e.target.value)} /></label><label>Adventurer title<input maxLength="35" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The Wayfinder" /></label><label>Choose your avatar</label><div className="emoji-picker avatar-picker">{['🧙', '🧝', '🧑‍🚀', '🦊', '🐺', '🦉', '🐉', '🧚'].map((item) => <button type="button" key={item} className={avatar === item ? 'selected' : ''} onClick={() => setAvatar(item)}>{item}</button>)}</div>{error && <span className="form-error">{error}</span>}<div className="modal-actions"><span className="modal-spacer" /><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="primary-button" type="submit">Save profile <Check size={15} /></button></div></form></>
}

export default App

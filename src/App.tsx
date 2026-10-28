import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock3,
  Dice5,
  Heart,
  Library,
  Play,
  Plus,
  Settings2,
  Sparkles,
  TimerReset,
  WandSparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import SpeechTimer, { type PracticeMode, type PracticeProcess, type RecordedAttempt } from './components/SpeechTimer'
import CategoryDropdown from './components/CategoryDropdown'
import GroupPicker from './components/GroupPicker'
import TopicLibrary from './components/TopicLibrary'
import TopicExtractor from './components/TopicExtractor'
import ProgressView, { type SessionRecord } from './components/ProgressView'
import { categories, getCategory, type CustomGroup, type Lang, type LocalizedText, type Topic, type TopicCategory } from './data/topics'
import { playTopicLand, playTopicShuffle, playTopicTick } from './lib/audio'
import { processRecording } from './lib/audioProcessing'
import { clearRecordings, saveRecording } from './lib/recordingStore'
import type { ExtractedTopic } from './lib/topicExtraction'

type View = 'practice' | 'library' | 'extract' | 'progress'

interface Settings {
  speechSeconds: number
  researchSeconds: number
  outlineSeconds: number
  drawSeconds: number
}

interface CustomTopicDraft {
  groupName: string
  zh: string
  en: string
  zhHint: string
  enHint: string
}

const DEFAULT_CUSTOM_GROUP_ID = 'my-topics'
const defaultCustomGroups: CustomGroup[] = [{
  id: DEFAULT_CUSTOM_GROUP_ID,
  name: { zh: '我的新增主题', en: 'My topics' },
  createdAt: 'default',
}]

const defaultSettings: Settings = {
  speechSeconds: 120,
  researchSeconds: 180,
  outlineSeconds: 90,
  drawSeconds: 2.8,
}

const modeMeta = {
  quick: {
    zh: '即兴表达',
    en: 'Impromptu',
    zhDesc: '日常、身体、效率、汇报和面试场景，题目更轻，适合马上开口。',
    enDesc: 'Everyday, wellness, productivity, reporting, and interview prompts for speaking immediately.',
    mark: '01',
  },
  research: {
    zh: '研究陈述',
    en: 'Research brief',
    zhDesc: '概念、商业、科技、历史、专业课程等，适合查资料后再表达。',
    enDesc: 'Concepts, business, technology, history, and academic prompts that invite research first.',
    mark: '02',
  },
  structure: {
    zh: '结构化回答',
    en: 'Structured answer',
    zhDesc: '先列骨架再表达，匹配汇报、面试、考公和学术场景。',
    enDesc: 'Build an outline first for reporting, interviews, public service, and academic prompts.',
    mark: '03',
  },
} as const

const modeCategoryIds: Record<PracticeMode, string[]> = {
  quick: [
    'general',
    'fitness',
    'nutrition',
    'productivity',
    'work-reports',
    'job-interview',
    'civil-service',
  ],
  research: [
    'deep',
    'finance',
    'entrepreneurship',
    'startups',
    'tech-ai',
    'history',
    'literature',
    'graduate-exam',
    'academic',
  ],
  structure: [
    'general',
    'productivity',
    'work-reports',
    'job-interview',
    'civil-service',
    'graduate-exam',
    'academic',
  ],
}

const preferredModeForCategory = (categoryId: string): PracticeMode => {
  if (modeCategoryIds.quick.includes(categoryId)) return 'quick'
  if (modeCategoryIds.research.includes(categoryId)) return 'research'
  return 'quick'
}

const copy = {
  zh: {
    brandLine: '表达训练工作台',
    navPractice: '练习台',
    navLibrary: '主题库',
    navExtract: '智能拆题',
    navProgress: '成长记录',
    settings: '设置',
    practiceEyebrow: '今日练习',
    practiceTitle: '开口前，先把注意力放回题目。',
    practiceSubtitle: '选择表达方式与主题场景，抽取一道题，完成一轮有反馈的计时练习。',
    chooseMode: '选择练习方式',
    chooseCategory: '选择主题场景',
    available: '可用题目',
    draw: '换一题',
    drawing: '正在抽取…',
    landed: '题目已落定',
    topicAnnouncement: '本轮题目',
    start: '开始练习',
    startResearch: '开始调研',
    startStructure: '开始准备',
    favourite: '收藏',
    favouriteActive: '已收藏',
    promptLabel: '本题表达抓手',
    sequence: '本轮流程',
    quickSequence: ['抽到题目', '立即表达', '完成复盘'],
    researchSequence: ['调研计时', '整理框架', '表达收束'],
    structureSequence: ['列出骨架', '正式表达', '完成复盘'],
    recent: '最近练过',
    noRecent: '还没有练习记录。',
    duration: '表达时长',
    drawDuration: '抽卡轮动时长',
    drawDurationHint: '控制从点击“换一题”到题目落定的速度，可调范围 1.5–5 秒。',
    modeHint: '当前时长可在设置中调整。',
    settingTitle: '练习设置',
    settingSubtitle: '时间只在本地保存，适合个人节奏。',
    speechTime: '即兴表达时长',
    researchTime: '调研准备时长',
    outlineTime: '结构化准备时长',
    seconds: '秒',
    minutes: '分钟',
    sound: '提示音',
    soundOn: '开启',
    soundOff: '关闭',
    language: '界面与题目语言',
    customTitle: '新建自定义题目',
    customSubtitle: '可以只填写一种语言，另一种会自动使用相同内容。',
    customCategory: '归入主题',
    customZh: '中文题目',
    customEn: '英文题目',
    customZhHint: '中文表达抓手（可选）',
    customEnHint: 'English cue (optional)',
    cancel: '取消',
    saveTopic: '保存题目',
    required: '请至少填写一种语言的题目。',
    close: '关闭',
  },
  en: {
    brandLine: 'Speaking practice studio',
    navPractice: 'Practice',
    navLibrary: 'Library',
    navExtract: 'Extract',
    navProgress: 'Progress',
    settings: 'Settings',
    practiceEyebrow: 'Today’s practice',
    practiceTitle: 'Before speaking, return your attention to the prompt.',
    practiceSubtitle: 'Choose a mode and context, draw a prompt, then complete one timed round with feedback.',
    chooseMode: 'Practice mode',
    chooseCategory: 'Topic context',
    available: 'Available prompts',
    draw: 'Draw another',
    drawing: 'Drawing…',
    landed: 'Prompt landed',
    topicAnnouncement: 'Current prompt',
    start: 'Start practice',
    startResearch: 'Start research',
    startStructure: 'Start prep',
    favourite: 'Save',
    favouriteActive: 'Saved',
    promptLabel: 'Speaking cue',
    sequence: 'This round',
    quickSequence: ['Draw prompt', 'Speak immediately', 'Reflect'],
    researchSequence: ['Research timer', 'Build structure', 'Deliver'],
    structureSequence: ['Outline', 'Deliver', 'Reflect'],
    recent: 'Recently practiced',
    noRecent: 'No practice history yet.',
    duration: 'Speech length',
    drawDuration: 'Prompt draw duration',
    drawDurationHint: 'Controls the interval from clicking “Draw another” to the prompt landing. Range: 1.5–5 seconds.',
    modeHint: 'Change the duration in settings.',
    settingTitle: 'Practice settings',
    settingSubtitle: 'Preferences stay on this device and follow your own rhythm.',
    speechTime: 'Impromptu speech',
    researchTime: 'Research prep',
    outlineTime: 'Structured prep',
    seconds: 'seconds',
    minutes: 'minutes',
    sound: 'Audio cues',
    soundOn: 'On',
    soundOff: 'Off',
    language: 'Interface & prompt language',
    customTitle: 'Create a custom topic',
    customSubtitle: 'Fill in one language and the other will use the same content.',
    customCategory: 'Topic context',
    customZh: 'Chinese prompt',
    customEn: 'English prompt',
    customZhHint: 'Chinese speaking cue (optional)',
    customEnHint: 'English cue (optional)',
    cancel: 'Cancel',
    saveTopic: 'Save topic',
    required: 'Add a prompt in at least one language.',
    close: 'Close',
  },
} as const

function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? (JSON.parse(saved) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Local storage may be unavailable in private browsing.
    }
  }, [key, value])

  return [value, setValue] as const
}

function formatDuration(seconds: number, lang: Lang) {
  if (seconds < 60) return `${seconds} ${lang === 'zh' ? '秒' : 'sec'}`
  const minutes = seconds / 60
  return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} ${lang === 'zh' ? '分钟' : 'min'}`
}

export default function App() {
  const [lang, setLang] = usePersistentState<Lang>('sayfield-language', 'zh')
  const [favorites, setFavorites] = usePersistentState<string[]>('sayfield-favorites', [])
  const [sessions, setSessions] = usePersistentState<SessionRecord[]>('sayfield-sessions', [])
  const [customGroups, setCustomGroups] = usePersistentState<CustomGroup[]>('sayfield-custom-groups', defaultCustomGroups)
  const [customTopics, setCustomTopics] = usePersistentState<Topic[]>('sayfield-custom-topics', [])
  const [settings, setSettings] = usePersistentState<Settings>('sayfield-settings', defaultSettings)
  const [soundOn, setSoundOn] = usePersistentState<boolean>('sayfield-sound', true)
  const [view, setView] = useState<View>('practice')
  const [mode, setMode] = useState<PracticeMode>('quick')
  const [categoryId, setCategoryId] = useState(categories[0].id)
  const [topic, setTopic] = useState<Topic>(categories[0].topics[0])
  const [timerOpen, setTimerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customDraft, setCustomDraft] = useState<CustomTopicDraft>({
    groupName: lang === 'zh' ? '我的新增主题' : 'My topics',
    zh: '',
    en: '',
    zhHint: '',
    enHint: '',
  })
  const [customError, setCustomError] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [landed, setLanded] = useState(false)
  const drawTimeoutRef = useRef<number | null>(null)
  const landedTimeoutRef = useRef<number | null>(null)

  const t = copy[lang]
  const currentSettings = { ...defaultSettings, ...settings }
  const customGroupCategories = useMemo<TopicCategory[]>(() => customGroups.map((group) => ({
    id: group.id,
    name: group.name,
    description: {
      zh: '你自己新增或 Agent 拆解后归入的主题。',
      en: 'Topics you added or extracted with your own Agent.',
    },
    mark: 'MY',
    accent: '#ff5a36',
    topics: [],
  })), [customGroups])
  const workspaceCategories = useMemo(
    () => [...categories, ...customGroupCategories],
    [customGroupCategories],
  )
  const activeCategory = workspaceCategories.find((category) => category.id === categoryId) ?? categories[0]
  const favoriteSet = useMemo(() => new Set(favorites), [favorites])
  const categoryTopics = useMemo(
    () => [...customTopics.filter((item) => item.categoryId === activeCategory.id), ...activeCategory.topics],
    [activeCategory, customTopics],
  )
  const modeCategories = useMemo(
    () => [...modeCategoryIds[mode].map((id) => getCategory(id)), ...customGroupCategories],
    [customGroupCategories, mode],
  )
  const categoryTopicCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    modeCategories.forEach((category) => {
      counts[category.id] = category.topics.length + customTopics.filter((item) => item.categoryId === category.id).length
    })
    return counts
  }, [customTopics, modeCategories])
  const prepSeconds = mode === 'research' ? settings.researchSeconds : settings.outlineSeconds
  const currentCategoryForTopic = workspaceCategories.find((item) => item.id === topic.categoryId) ?? activeCategory

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  useEffect(() => {
    if (!customTopics.length || !customGroups.length) return
    const groupIds = new Set(customGroups.map((group) => group.id))
    if (!customTopics.some((item) => !groupIds.has(item.categoryId))) return
    const fallbackGroup = customGroups.find((group) => group.id === DEFAULT_CUSTOM_GROUP_ID) ?? customGroups[0]
    setCustomTopics((current) => current.map((item) => (
      groupIds.has(item.categoryId) ? item : { ...item, categoryId: fallbackGroup.id }
    )))
  }, [customGroups, customTopics, setCustomTopics])

  useEffect(() => () => {
    if (drawTimeoutRef.current !== null) window.clearTimeout(drawTimeoutRef.current)
    if (landedTimeoutRef.current !== null) window.clearTimeout(landedTimeoutRef.current)
  }, [])

  const drawTopic = () => {
    if (drawing) return
    const pool = categoryTopics.length ? categoryTopics : activeCategory.topics
    const candidates = pool.length > 1 ? pool.filter((item) => item.id !== topic.id) : pool
    const finalTopic = candidates[Math.floor(Math.random() * candidates.length)]
    if (!finalTopic) return

    setDrawing(true)
    setLanded(false)
    if (landedTimeoutRef.current !== null) window.clearTimeout(landedTimeoutRef.current)
    if (soundOn) playTopicShuffle()

    const totalSteps = 24
    const totalDurationMs = currentSettings.drawSeconds * 1000
    const stepWeights = Array.from({ length: totalSteps - 1 }, (_, index) => {
      const step = index + 1
      return 70 + Math.pow(step / totalSteps, 2) * 300
    })
    const weightTotal = stepWeights.reduce((sum, weight) => sum + weight, 0)
    let step = 0

    const runStep = () => {
      const previewPool = pool.length > 1 ? pool.filter((item) => item.id !== topic.id) : pool
      const preview = previewPool[Math.floor(Math.random() * previewPool.length)]
      if (preview) setTopic(preview)
      if (soundOn) playTopicTick(step / totalSteps)
      step += 1

      if (step >= totalSteps) {
        setTopic(finalTopic)
        setDrawing(false)
        setLanded(true)
        if (soundOn) playTopicLand()
        landedTimeoutRef.current = window.setTimeout(() => setLanded(false), 720)
        return
      }

      const delay = totalDurationMs * (stepWeights[step - 1] ?? 0) / weightTotal
      drawTimeoutRef.current = window.setTimeout(runStep, delay)
    }

    runStep()
  }

  const selectCategory = (nextId: string) => {
    const nextCategory = workspaceCategories.find((category) => category.id === nextId) ?? categories[0]
    setCategoryId(nextId)
    const pool = [...customTopics.filter((item) => item.categoryId === nextId), ...nextCategory.topics]
    setTopic(pool[Math.floor(Math.random() * pool.length)] ?? nextCategory.topics[0])
  }

  const selectMode = (nextMode: PracticeMode) => {
    setMode(nextMode)
    if (customGroups.some((group) => group.id === categoryId) || modeCategoryIds[nextMode].includes(categoryId)) return

    const nextCategoryId = modeCategoryIds[nextMode][0]
    const nextCategory = getCategory(nextCategoryId)
    const pool = [...nextCategory.topics, ...customTopics.filter((item) => item.categoryId === nextCategoryId)]
    setCategoryId(nextCategoryId)
    setTopic(pool[Math.floor(Math.random() * pool.length)] ?? nextCategory.topics[0])
  }

  const toggleFavorite = (id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const useLibraryTopic = (nextTopic: Topic) => {
    const nextCategory = workspaceCategories.find((item) => item.id === nextTopic.categoryId)
    if (nextCategory) setCategoryId(nextCategory.id)
    setMode(preferredModeForCategory(nextTopic.categoryId))
    setTopic(nextTopic)
    setView('practice')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const recordSession = (spokenSeconds: number, process?: PracticeProcess) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const record: SessionRecord = {
      id,
      topicId: topic.id,
      title: topic.title[lang],
      categoryId: currentCategoryForTopic.id,
      categoryName: currentCategoryForTopic.name[lang],
      mode,
      language: lang,
      seconds: spokenSeconds,
      completedAt: process?.completedAt || new Date().toISOString(),
      process,
    }
    setSessions((current) => [record, ...current].slice(0, 200))
    return id
  }

  const attachRecording = async (sessionId: string, recording: RecordedAttempt) => {
    const processed = await processRecording(recording.blob)
    const duration = processed.duration || recording.duration
    const saved = await saveRecording(sessionId, processed.blob)
    if (!saved) return
    setSessions((current) => current.map((session) => (
      session.id === sessionId
        ? {
            ...session,
            transcript: recording.transcript,
            recording: {
              mimeType: processed.mimeType,
              size: processed.blob.size,
              duration,
              createdAt: new Date().toISOString(),
              deviceLabel: recording.deviceLabel,
            },
          }
        : session
    )))
  }

  const clearSessions = async () => {
    await clearRecordings()
    setSessions([])
  }

  const resolveCustomGroup = (rawName: string) => {
    const name = rawName.trim() || (lang === 'zh' ? '我的新增主题' : 'My topics')
    const existing = customGroups.find((group) => group.name.zh === name || group.name.en === name)
    if (existing) return { group: existing, created: false }
    const group: CustomGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: { zh: name, en: name },
      createdAt: new Date().toISOString(),
    }
    return { group, created: true }
  }

  const createCustomGroup = (rawName: string) => {
    const { group, created } = resolveCustomGroup(rawName)
    if (created) setCustomGroups((current) => [group, ...current])
    return group.id
  }

  const renameCustomGroup = (groupId: string, rawName: string) => {
    const name = rawName.trim()
    if (!name) return
    setCustomGroups((current) => current.map((group) => (
      group.id === groupId ? { ...group, name: { zh: name, en: name } } : group
    )))
  }

  const deleteCustomGroup = (groupId: string) => {
    if (groupId === DEFAULT_CUSTOM_GROUP_ID) return
    const fallbackGroupId = customGroups.find((group) => group.id === DEFAULT_CUSTOM_GROUP_ID)?.id
      ?? customGroups.find((group) => group.id !== groupId)?.id
    if (!fallbackGroupId) return
    setCustomGroups((current) => current.filter((group) => group.id !== groupId))
    setCustomTopics((current) => current.map((item) => (
      item.categoryId === groupId ? { ...item, categoryId: fallbackGroupId } : item
    )))
    if (categoryId === groupId) setCategoryId(fallbackGroupId)
  }

  const moveCustomTopic = (topicId: string, groupName: string) => {
    const { group, created } = resolveCustomGroup(groupName)
    if (created) setCustomGroups((current) => [group, ...current])
    setCustomTopics((current) => current.map((item) => (
      item.id === topicId ? { ...item, categoryId: group.id } : item
    )))
    if (topic.id === topicId) setCategoryId(group.id)
  }

  const openCustomTopic = () => {
    const defaultGroup = customGroups.find((group) => group.id === DEFAULT_CUSTOM_GROUP_ID) ?? customGroups[0]
    setCustomDraft((current) => ({
      ...current,
      groupName: defaultGroup?.name[lang] ?? (lang === 'zh' ? '我的新增主题' : 'My topics'),
    }))
    setCustomError('')
    setCustomOpen(true)
  }

  const saveCustomTopic = () => {
    const zh = customDraft.zh.trim()
    const en = customDraft.en.trim()
    if (!zh && !en) {
      setCustomError(t.required)
      return
    }
    const fallback = zh || en
    const { group, created } = resolveCustomGroup(customDraft.groupName)
    if (created) setCustomGroups((current) => [group, ...current])
    const newTopic: Topic = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      categoryId: group.id,
      title: { zh: zh || fallback, en: en || fallback },
      hint: {
        zh: customDraft.zhHint.trim() || '先给结论，再给两个理由，最后用具体例子收口。',
        en: customDraft.enHint.trim() || 'Lead with a conclusion, give two reasons, then close with a concrete example.',
      },
    }
    setCustomTopics((current) => [newTopic, ...current])
    setMode('quick')
    setCategoryId(group.id)
    setTopic(newTopic)
    setCustomOpen(false)
    setView('practice')
  }

  const removeCustomTopic = (id: string) => {
    const remaining = customTopics.filter((item) => item.id !== id)
    setCustomTopics(remaining)
    setFavorites((current) => current.filter((item) => item !== id))
    if (topic.id === id) {
      const groupTopics = remaining.filter((item) => item.categoryId === categoryId)
      setTopic(groupTopics[0] ?? categories[0].topics[0])
      if (!groupTopics.length) {
        setCategoryId(categories[0].id)
        setMode('quick')
      }
    }
  }

  const saveExtractedTopics = (items: ExtractedTopic[], groupName: string) => {
    const { group, created } = resolveCustomGroup(groupName)
    if (created) setCustomGroups((current) => [group, ...current])
    const stamp = Date.now()
    const newTopics: Topic[] = items.map((item, index) => ({
      id: `custom-extract-${stamp}-${index + 1}`,
      categoryId: group.id,
      title: item.title,
      hint: item.hint,
      keywords: [item.title.zh, item.title.en],
    }))
    setCustomTopics((current) => [...newTopics, ...current])
    setMode('quick')
    setCategoryId(group.id)
    setTopic(newTopics[0] ?? categories[0].topics[0])
    setView('library')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const topicTitleLength = topic.title[lang].replace(/\s/g, '').length
  const topicTitleClass = topicTitleLength > 42 ? 'is-very-long-title' : topicTitleLength > 24 ? 'is-long-title' : ''

  const activeSequence = mode === 'quick' ? t.quickSequence : mode === 'research' ? t.researchSequence : t.structureSequence
  const startLabel = mode === 'quick' ? t.start : mode === 'research' ? t.startResearch : t.startStructure
  const orderedRecent = sessions.slice(0, 3)

  return (
    <div className="app-shell">
      <div className="background-grid" aria-hidden="true" />
      <header className="site-header">
        <button className="brand" onClick={() => setView('practice')} aria-label="言之有物 home">
          <span className="brand-mark"><i />言</span>
          <span>
            <b>言之有物</b>
            <small>SPEAKING PRACTICE COACH · {t.brandLine}</small>
          </span>
        </button>

        <nav className="main-nav" aria-label="Primary navigation">
          <button className={view === 'practice' ? 'is-active' : ''} onClick={() => setView('practice')}>
            <Sparkles size={16} />
            {t.navPractice}
          </button>
          <button className={view === 'library' ? 'is-active' : ''} onClick={() => setView('library')}>
            <Library size={16} />
            {t.navLibrary}
          </button>
          <button className={view === 'extract' ? 'is-active' : ''} onClick={() => setView('extract')}>
            <WandSparkles size={16} />
            {t.navExtract}
          </button>
          <button className={view === 'progress' ? 'is-active' : ''} onClick={() => setView('progress')}>
            <BarChart3 size={16} />
            {t.navProgress}
          </button>
        </nav>

        <div className="header-actions">
          <div className="language-switch" aria-label={t.language}>
            <button className={lang === 'zh' ? 'is-active' : ''} onClick={() => setLang('zh')}>中</button>
            <button className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
          <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label={t.settings}>
            <Settings2 size={19} />
          </button>
        </div>
      </header>

      <main className="app-main">
        {view === 'practice' && (
          <section className="practice-page">
            <header className="page-heading practice-heading">
              <div>
                <p className="eyebrow">{t.practiceEyebrow}</p>
                <h1>{t.practiceTitle}</h1>
                <p>{t.practiceSubtitle}</p>
              </div>
              <div className="today-stamp">
                <span>{new Date().toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                <b>{sessions.length}</b>
                <small>{t.navProgress}</small>
              </div>
            </header>

            <div className="practice-grid">
              <aside className="control-panel">
                <div className="panel-section">
                  <div className="panel-title">
                    <span>01</span>
                    <h2>{t.chooseMode}</h2>
                  </div>
                  <div className="mode-stack">
                    {(Object.keys(modeMeta) as PracticeMode[]).map((modeId) => {
                      const item = modeMeta[modeId]
                      return (
                        <button
                          className={mode === modeId ? 'is-active' : ''}
                          onClick={() => selectMode(modeId)}
                          key={modeId}
                        >
                          <span className="mode-number">{item.mark}</span>
                          <span>
                            <b>{item[lang]}</b>
                            <small>{lang === 'zh' ? item.zhDesc : item.enDesc}</small>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="panel-section">
                  <div className="panel-title">
                    <span>02</span>
                    <h2>{t.chooseCategory}</h2>
                  </div>
                  <CategoryDropdown
                    lang={lang}
                    categories={modeCategories}
                    value={categoryId}
                    counts={categoryTopicCounts}
                    onChange={selectCategory}
                    disabled={drawing}
                    label={t.chooseCategory}
                  />
                  <p className="category-description">{activeCategory.description[lang]}</p>
                  <p className="mode-pool-note">
                    {lang === 'zh' ? `${modeCategories.length} 个适配场景` : `${modeCategories.length} matched contexts`}
                  </p>
                  <div className="rail-stats">
                    <span><b>{categoryTopics.length}</b>{t.available}</span>
                    <span><b>{Math.round(settings.speechSeconds / 60 * 10) / 10}</b>{t.duration}</span>
                  </div>
                </div>
              </aside>

              <div className="practice-workspace">
                <article
                  id="topic-stage"
                  className={`topic-stage ${drawing ? 'is-drawing' : ''} ${landed ? 'is-landed' : ''} ${topicTitleClass}`}
                  style={{ '--topic-accent': currentCategoryForTopic.accent } as React.CSSProperties}
                  tabIndex={-1}
                  aria-busy={drawing}
                >
                  <div className="topic-stage-top">
                    <div className="topic-origin">
                      <span className="topic-origin-mark">{currentCategoryForTopic.mark}</span>
                      <span>
                        <b>{currentCategoryForTopic.name[lang]}</b>
                        <small>{t.promptLabel}</small>
                      </span>
                    </div>
                    <button
                      className={`save-topic-button ${favoriteSet.has(topic.id) ? 'is-active' : ''}`}
                      onClick={() => toggleFavorite(topic.id)}
                      disabled={drawing}
                    >
                      <Heart size={17} fill={favoriteSet.has(topic.id) ? 'currentColor' : 'none'} />
                      {favoriteSet.has(topic.id) ? t.favouriteActive : t.favourite}
                    </button>
                  </div>

                  <div className="topic-stage-body">
                    <p className="prompt-kicker">{drawing ? 'DRAWING' : 'PROMPT'} / {String(categoryTopics.findIndex((item) => item.id === topic.id) + 1).padStart(2, '0')}</p>
                    <h2>{topic.title[lang]}</h2>
                    <div className="prompt-cue">
                      <span />
                      <p>{topic.hint[lang]}</p>
                    </div>
                    {drawing && (
                      <div className="draw-status" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                        <b>{t.drawing}</b>
                      </div>
                    )}
                    {landed && !drawing && (
                      <div className="draw-status is-landed" role="status" aria-live="polite">
                        <Sparkles size={14} />
                        <b>{t.landed}</b>
                        <span>{topic.title[lang]}</span>
                      </div>
                    )}
                  </div>

                  <div className="topic-stage-actions">
                    <button className="button button-light" onClick={drawTopic} disabled={drawing}>
                      <Dice5 className={drawing ? 'is-spinning' : ''} size={19} />
                      {drawing ? t.drawing : t.draw}
                    </button>
                    <button className="button button-ink large" onClick={() => setTimerOpen(true)} disabled={drawing}>
                      <Play size={18} fill="currentColor" />
                      {startLabel}
                    </button>
                  </div>
                </article>

                <div className="workspace-details">
                  <article className="sequence-card">
                    <div className="section-title-row">
                      <h2>{t.sequence}</h2>
                      <span>{formatDuration(mode === 'quick' ? settings.speechSeconds : prepSeconds, lang)}</span>
                    </div>
                    <ol>
                      {activeSequence.map((step, index) => (
                        <li key={step}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <b>{step}</b>
                          {index < activeSequence.length - 1 && <ArrowRight size={16} />}
                        </li>
                      ))}
                    </ol>
                    <p><Clock3 size={15} /> {t.modeHint}</p>
                  </article>

                  <article className="recent-mini-card">
                    <div className="section-title-row">
                      <h2>{t.recent}</h2>
                      <button onClick={() => setView('progress')}>{t.navProgress}</button>
                    </div>
                    {orderedRecent.length ? (
                      <div className="mini-session-list">
                        {orderedRecent.map((session) => (
                          <div key={session.id}>
                            <span className={`mode-dot mode-${session.mode}`} />
                            <div>
                              <b>{session.title}</b>
                              <small>{session.categoryName}</small>
                            </div>
                            <time>{Math.round(session.seconds / 60 * 10) / 10}m</time>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-inline">
                        <TimerReset size={18} />
                        <span>{t.noRecent}</span>
                      </div>
                    )}
                  </article>
                </div>
              </div>
            </div>
          </section>
        )}

        {view === 'library' && (
          <TopicLibrary
            lang={lang}
            categories={categories}
            customGroups={customGroups}
            customTopics={customTopics}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onUseTopic={useLibraryTopic}
            onDeleteCustom={removeCustomTopic}
            onOpenCustom={openCustomTopic}
            onCreateGroup={createCustomGroup}
            onRenameGroup={renameCustomGroup}
            onDeleteGroup={deleteCustomGroup}
            onMoveTopic={moveCustomTopic}
          />
        )}

        <div className={view === 'extract' ? '' : 'view-hidden'} aria-hidden={view !== 'extract'}>
          <TopicExtractor lang={lang} customGroups={customGroups} onSave={saveExtractedTopics} />
        </div>

        {view === 'progress' && (
          <ProgressView
            lang={lang}
            sessions={sessions}
            onClear={clearSessions}
            onUpdateSession={(sessionId, patch) => setSessions((current) => current.map((session) => (
              session.id === sessionId ? { ...session, ...patch } : session
            )))}
          />
        )}
      </main>

      {timerOpen && (
        <SpeechTimer
          mode={mode}
          topic={topic}
          lang={lang}
          speechSeconds={settings.speechSeconds}
          prepSeconds={prepSeconds}
          soundOn={soundOn}
          onClose={() => setTimerOpen(false)}
          onComplete={recordSession}
          onRecordingComplete={attachRecording}
        />
      )}

      {settingsOpen && (
        <div className="drawer-backdrop" onMouseDown={() => setSettingsOpen(false)}>
          <aside className="settings-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p className="eyebrow">{t.settings}</p>
                <h2>{t.settingTitle}</h2>
                <p>{t.settingSubtitle}</p>
              </div>
              <button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label={t.close}>
                <X size={19} />
              </button>
            </header>

            <div className="settings-group">
              <label>
                <span>{t.drawDuration}</span>
                <b>{formatDuration(currentSettings.drawSeconds, lang)}</b>
                <input
                  type="range"
                  min={1.5}
                  max={5}
                  step={0.1}
                  value={currentSettings.drawSeconds}
                  onChange={(event) => setSettings((current) => ({ ...current, drawSeconds: Number(event.target.value) }))}
                />
                <small>{t.drawDurationHint}</small>
              </label>
              <label>
                <span>{t.speechTime}</span>
                <b>{formatDuration(settings.speechSeconds, lang)}</b>
                <input
                  type="range"
                  min={30}
                  max={600}
                  step={30}
                  value={currentSettings.speechSeconds}
                  onChange={(event) => setSettings((current) => ({ ...current, speechSeconds: Number(event.target.value) }))}
                />
              </label>
              <label>
                <span>{t.researchTime}</span>
                <b>{formatDuration(settings.researchSeconds, lang)}</b>
                <input
                  type="range"
                  min={60}
                  max={1800}
                  step={60}
                  value={currentSettings.researchSeconds}
                  onChange={(event) => setSettings((current) => ({ ...current, researchSeconds: Number(event.target.value) }))}
                />
              </label>
              <label>
                <span>{t.outlineTime}</span>
                <b>{formatDuration(settings.outlineSeconds, lang)}</b>
                <input
                  type="range"
                  min={30}
                  max={600}
                  step={30}
                  value={currentSettings.outlineSeconds}
                  onChange={(event) => setSettings((current) => ({ ...current, outlineSeconds: Number(event.target.value) }))}
                />
              </label>
            </div>

            <div className="settings-row">
              <span>{t.sound}</span>
              <button className={`toggle-button ${soundOn ? 'is-on' : ''}`} onClick={() => setSoundOn((current) => !current)}>
                {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
                {soundOn ? t.soundOn : t.soundOff}
              </button>
            </div>

            <div className="settings-row language-row">
              <span>{t.language}</span>
              <div className="language-switch large">
                <button className={lang === 'zh' ? 'is-active' : ''} onClick={() => setLang('zh')}>中文</button>
                <button className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')}>English</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {customOpen && (
        <div className="modal-backdrop" onMouseDown={() => setCustomOpen(false)}>
          <div className="custom-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <div>
                <p className="eyebrow">{t.navLibrary}</p>
                <h2>{t.customTitle}</h2>
                <p>{t.customSubtitle}</p>
              </div>
              <button className="icon-button" onClick={() => setCustomOpen(false)} aria-label={t.close}>
                <X size={19} />
              </button>
            </header>

            <div className="field">
              <span>{t.customCategory}</span>
              <GroupPicker
                lang={lang}
                groups={customGroups}
                value={customDraft.groupName}
                onChange={(groupName) => setCustomDraft((current) => ({ ...current, groupName }))}
                label={t.customCategory}
                placeholder={lang === 'zh' ? '输入新分组名称' : 'New group name'}
                createLabel={lang === 'zh' ? '新建分组' : 'New group'}
              />
            </div>

            <div className="form-grid">
              <label className="field">
                <span>{t.customZh}</span>
                <input
                  value={customDraft.zh}
                  onChange={(event) => setCustomDraft((current) => ({ ...current, zh: event.target.value }))}
                  placeholder="例如：如何用三分钟汇报项目风险？"
                />
              </label>
              <label className="field">
                <span>{t.customEn}</span>
                <input
                  value={customDraft.en}
                  onChange={(event) => setCustomDraft((current) => ({ ...current, en: event.target.value }))}
                  placeholder="e.g. How would you report project risk in three minutes?"
                />
              </label>
              <label className="field">
                <span>{t.customZhHint}</span>
                <input
                  value={customDraft.zhHint}
                  onChange={(event) => setCustomDraft((current) => ({ ...current, zhHint: event.target.value }))}
                  placeholder="先讲影响，再讲原因与方案"
                />
              </label>
              <label className="field">
                <span>{t.customEnHint}</span>
                <input
                  value={customDraft.enHint}
                  onChange={(event) => setCustomDraft((current) => ({ ...current, enHint: event.target.value }))}
                  placeholder="Lead with impact, then cause and options"
                />
              </label>
            </div>

            {customError && <p className="form-error">{customError}</p>}

            <footer>
              <button className="button button-ghost" onClick={() => setCustomOpen(false)}>{t.cancel}</button>
              <button className="button button-dark" onClick={saveCustomTopic}>
                <Plus size={17} />
                {t.saveTopic}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}

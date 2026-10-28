import type { Lang, LocalizedText } from '../data/topics'

export type ExtractionDomain = 'general' | 'academic' | 'business' | 'public' | 'work' | 'tech'
export type ExtractionDepth = 'low' | 'medium' | 'high'

export interface ExtractionDomainOption {
  id: ExtractionDomain
  label: LocalizedText
  description: LocalizedText
}

export interface ExtractedTopic {
  title: LocalizedText
  hint: LocalizedText
}

export interface AgentPromptOptions {
  mode: 'theme' | 'pdf'
  theme: string
  fileName: string
  domain: string
  depth: ExtractionDepth
  count: number
  lang: Lang
}

export interface ExtractionDepthOption {
  id: ExtractionDepth
  label: LocalizedText
  description: LocalizedText
}

export const extractionDomains: ExtractionDomainOption[] = [
  {
    id: 'general',
    label: { zh: '通用表达', en: 'General' },
    description: { zh: '适合日常、观点和社会话题。', en: 'For everyday, opinion, and social topics.' },
  },
  {
    id: 'academic',
    label: { zh: '学术研究', en: 'Academic' },
    description: { zh: '适合论文、课程和专业表达。', en: 'For papers, courses, and academic speaking.' },
  },
  {
    id: 'business',
    label: { zh: '商业分析', en: 'Business' },
    description: { zh: '适合创业、产品和市场分析。', en: 'For startups, products, and market analysis.' },
  },
  {
    id: 'public',
    label: { zh: '公共政策', en: 'Public policy' },
    description: { zh: '适合考公、治理和政策讨论。', en: 'For civil service, governance, and policy.' },
  },
  {
    id: 'work',
    label: { zh: '工作汇报', en: 'Work report' },
    description: { zh: '适合项目、复盘和向上汇报。', en: 'For projects, reviews, and upward reporting.' },
  },
  {
    id: 'tech',
    label: { zh: '科技与 AI', en: 'Tech & AI' },
    description: { zh: '适合解释技术机制、风险和产品选择。', en: 'For mechanisms, risks, and product choices.' },
  },
]

export const extractionDepths: ExtractionDepthOption[] = [
  {
    id: 'low',
    label: { zh: '低', en: 'Low' },
    description: { zh: '定义、概念区分和熟悉例子，建立基本理解。', en: 'Definitions, distinctions, and familiar examples to build basic understanding.' },
  },
  {
    id: 'medium',
    label: { zh: '中', en: 'Medium' },
    description: { zh: '因果链条、利弊权衡、现实案例和可执行判断。', en: 'Causal chains, tradeoffs, real cases, and actionable judgment.' },
  },
  {
    id: 'high',
    label: { zh: '高', en: 'High' },
    description: { zh: '机制、证据质量、反方论证、边界条件和二阶影响。', en: 'Mechanisms, evidence quality, counterarguments, boundary conditions, and second-order effects.' },
  },
]

const getDomainLabel = (domain: string, lang: Lang) =>
  extractionDomains.find((item) => item.id === domain)?.label[lang] ?? domain

export const buildAgentPrompt = ({
  mode,
  theme,
  fileName,
  domain,
  depth,
  count,
  lang,
}: AgentPromptOptions) => {
  const cleanTheme = theme.trim()
  const domainLabel = getDomainLabel(domain, lang)
  const depthOption = extractionDepths.find((item) => item.id === depth) ?? extractionDepths[1]
  const depthLabel = depthOption.label[lang]
  const depthInstruction = depthOption.description[lang]

  if (lang === 'zh') {
    const source = mode === 'pdf'
      ? `我随后会提供一份 PDF${fileName ? `（文件名：${fileName}）` : ''}。请先阅读并理解文件内容。`
      : `请围绕这个大主题展开：${cleanTheme || '（待补充）'}。`
    const context = mode === 'pdf' && cleanTheme ? `\n补充背景：${cleanTheme}` : ''

    return `你是我的表达训练题库编辑。${source}${context}

拆解领域：${domainLabel}
拆解深度：${depthLabel}
深度说明：${depthInstruction}
请最终输出 ${count} 个可以用于口述训练的小主题。

在生成最终表格前，请先在内部完成以下编辑流程：
A. 从材料或大主题中提取至少 ${count * 2} 个候选角度；
B. 逐个检查候选是否具体、完整、可独立回答；
C. 删除重复、空泛、同义改写和无法在 1–3 分钟内展开的问题；
D. 只保留最有张力、最有信息密度、最适合真实开口训练的 ${count} 个。

每个最终题目必须同时满足：
1. 完整、可独立回答，不能是关键词、半句话或只有概念的标题。
2. 包含具体场景、明确对象，以及一个需要作出判断、解释、比较、选择或建议的动作。
3. 回答者至少需要三点信息或一条推理链才能完成，不能一句话结束。
4. 与同组其他题目在焦点上明显不同，不能只是替换关键词。
5. “表达抓手”不能全部套用同一个模板，必须写出本题真正的难点或回答路径。
6. 至少覆盖两个适合模式，不能全部标成研究陈述。
7. “适合模式”列每行只能填写：即兴表达、研究陈述、结构化回答之一，不能填写机制、证据、决策等内容类别。
8. 中文题目控制在约 20–55 个汉字，英文 prompt 控制在 1–2 句；保留具体场景和张力，但不要写成小作文。

禁止输出以下空泛句式：
- “谈谈……”
- “如何看待……”（除非同时说明具体对象、立场冲突和限制条件）
- “……的重要性”
- “……的影响”
- “为什么……很重要”
- 空泛的“未来趋势”“发展前景”或“意义分析”
如果候选只是换词复刻这些句式，请直接重写。

深度必须真正体现在题目中：
- 低：用定义、概念区分和熟悉例子建立基本理解。
- 中：要求因果链条、利弊权衡、现实案例或可执行判断。
- 高：至少一半题目涉及机制、证据质量、反方论证、边界条件、反例或二阶影响。

如果是 PDF，优先覆盖不同章节和核心论点，题目中应隐含原文里的概念、论证或案例。

质量门禁：
- 能用一句话回答 → 淘汰。
- 两个题目可以共用同一套三点回答 → 合并。
- 没有具体判断或行动 → 重写。
- 只换名词、不换思考角度 → 删除。

最后严格输出为 Markdown 表格，列为：
| 中文题目 | English prompt | 表达抓手 | 适合模式 |
不要添加表格之外的解释。`
  }

  const source = mode === 'pdf'
    ? `I will provide a PDF${fileName ? ` (filename: ${fileName})` : ''}. Read and understand it first.`
    : `Work from this broad topic: ${cleanTheme || '(to be provided)'}.`
  const context = mode === 'pdf' && cleanTheme ? `\nAdditional context: ${cleanTheme}` : ''

  return `You are the editor of my speaking-practice topic library. ${source}${context}

Domain: ${domainLabel}
Depth: ${depthLabel}
Depth guidance: ${depthInstruction}
Return exactly ${count} subtopics for spoken practice.

Before producing the final table, do the following internally:
A. Extract at least ${count * 2} candidate angles from the source or broad topic.
B. Check each candidate for specificity, completeness, and standalone answerability.
C. Remove duplicates, vague rewrites, and topics that cannot sustain 1–3 minutes.
D. Keep only the strongest ${count} topics by tension, information density, and speaking value.

Every final topic must:
1. Be a complete, standalone prompt, not a keyword, fragment, or bare concept.
2. Include a concrete scenario, a clear object, and an action such as judging, explaining, comparing, choosing, or recommending.
3. Require at least three pieces of information or one reasoning chain to answer well.
4. Have a clearly different focus from every other topic in the set.
5. Use a speaking cue that identifies the real difficulty or response path rather than repeating a generic template.
6. Cover at least two suitable practice modes rather than labeling everything Research brief.
7. The mode column must contain exactly one of: Impromptu, Research brief, or Structured answer. Never put mechanism, evidence, or decision categories there.
8. Keep Chinese prompts to roughly 20–55 characters and English prompts to 1–2 sentences. Preserve specificity and tension without writing a mini-essay.

Do not output:
- “Talk about…”
- “What do you think about…” unless it adds a concrete tension and constraint
- “…is important”
- “The impact of…”
- “Why … matters”
- Generic “future trends,” “prospects,” or “significance” prompts

Match the selected depth:
- Low: definitions, distinctions, and familiar examples.
- Medium: causal chains, tradeoffs, real cases, and actionable judgment.
- High: at least half of the topics should involve mechanisms, evidence quality, counterarguments, boundary conditions, counterexamples, or second-order effects.

For a PDF, cover different chapters and central arguments, and make the source concepts, reasoning, or cases visible in the prompts.

Quality gate:
- If it can be answered in one sentence, reject it.
- If two topics share the same three-point answer, merge them.
- If there is no specific judgment or action, rewrite it.
- If only nouns change but the thinking angle stays the same, delete it.

Output only a Markdown table with these columns:
| 中文题目 | English prompt | 表达抓手 | 适合模式 |
Do not add any explanation outside the table.`
}

const hasCjk = (value: string) => /[\u3400-\u9fff]/.test(value)
const hasLatin = (value: string) => /[A-Za-z]/.test(value)
const cleanCell = (value: string) => value
  .replace(/\*\*/g, '')
  .replace(/`/g, '')
  .replace(/^["“”']+|["“”']+$/g, '')
  .trim()
const isSeparatorRow = (cells: string[]) => cells.every((cell) => /^:?-{2,}:?$/.test(cell.replace(/\s/g, '')))
const isHeaderRow = (cells: string[]) => {
  const joined = cells.join(' ').toLowerCase()
  return (joined.includes('中文') || joined.includes('chinese')) && (joined.includes('english') || joined.includes('prompt'))
}
const isModeCell = (value: string) => /^(即兴表达|研究陈述|结构化回答|impromptu|research brief|structured answer)/i.test(value.trim())

const rowToTopic = (cells: string[]): ExtractedTopic | null => {
  const clean = cells.map(cleanCell).filter(Boolean)
  if (!clean.length || isSeparatorRow(clean) || isHeaderRow(clean)) return null

  const zh = clean.find((cell) => hasCjk(cell)) ?? clean[0]
  const en = clean.find((cell) => hasLatin(cell) && !hasCjk(cell)) ?? zh
  const hint = [...clean]
    .reverse()
    .find((cell) => cell !== zh && cell !== en && !isModeCell(cell) && cell.length >= 6)
    ?? (hasCjk(zh) ? '先给结论，再给理由和一个具体场景。' : 'Lead with a conclusion, then add reasons and one concrete scene.')

  if (!zh && !en) return null
  return {
    title: { zh: zh || en, en: en || zh },
    hint: {
      zh: hasCjk(hint) ? hint : '先给结论，再给理由和一个具体场景。',
      en: hasLatin(hint) && !hasCjk(hint) ? hint : 'Lead with a conclusion, then add reasons and one concrete scene.',
    },
  }
}

export const parseAgentOutput = (text: string): ExtractedTopic[] => {
  const topics: ExtractedTopic[] = []
  const lines = text.split(/\r?\n/)

  lines.forEach((rawLine) => {
    const line = rawLine.trim()
    if (!line) return

    if (line.includes('|')) {
      const cells = line.replace(/^\||\|$/g, '').split('|')
      const topic = rowToTopic(cells)
      if (topic) topics.push(topic)
      return
    }

    const bullet = line.match(/^(?:[-*+]|\d+[.)、])\s*(.+)$/)
    if (!bullet) return
    const body = bullet[1].trim()
    const cells = body.includes('｜') ? body.split('｜') : body.includes('\t') ? body.split('\t') : [body]
    const topic = rowToTopic(cells)
    if (topic) topics.push(topic)
  })

  return topics.filter((topic, index) => {
    const key = `${topic.title.zh}::${topic.title.en}`.toLowerCase()
    return topics.findIndex((item) => `${item.title.zh}::${item.title.en}`.toLowerCase() === key) === index
  })
}

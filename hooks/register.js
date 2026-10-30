// 프롬프트 위(band)에 업무 영어 표현을 하나씩 보여주고, 일정 간격으로 넘긴다.
// 표현 목록은 GitHub Pages의 phrases.json에서 받아오고, 실패하면 저장해둔 목록이나
// 플러그인에 들어 있는 phrases.json을 쓴다.

const DATA_URL = 'https://dev-jonghoonpark.github.io/oh-my-business-english/phrases.json'
const REFRESH_MS = 6 * 60 * 60 * 1000

let phrases = []
let order = []
let currentId = null
// 저장해둔 위치가 아직 받은 목록에 없을 때, 나중에 목록이 갱신되면 그 위치로 돌아가기 위해 기억해둔다
let resumeId = null
let pinned = false
let intervalMs = 60_000
let shuffle = false
let rotation = null

function shuffled(ids) {
  const a = [...ids]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function setPhrases(list) {
  phrases = list.filter(p => p && typeof p.id === 'number' && p.ko && p.en).sort((a, b) => a.id - b.id)
  const ids = phrases.map(p => p.id)
  // 순서가 이미 있으면 새로 추가된 표현만 뒤에 붙여서, 보던 흐름이 흐트러지지 않게 한다
  const kept = order.filter(id => ids.includes(id))
  const added = ids.filter(id => !kept.includes(id))
  order = kept.length ? [...kept, ...(shuffle ? shuffled(added) : added)] : (shuffle ? shuffled(ids) : ids)
  if (resumeId !== null && ids.includes(resumeId)) {
    currentId = resumeId
    resumeId = null
  } else if (!order.includes(currentId)) {
    currentId = order[0] ?? null
  }
}

function current() {
  return phrases.find(p => p.id === currentId)
}

async function move($, step) {
  if (!order.length) return
  resumeId = null
  const i = Math.max(0, order.indexOf(currentId))
  currentId = order[(i + step + order.length) % order.length]
  $.ui.invalidate('ui.render')
  await $.store.set('currentId', currentId)
}

// 수동으로 넘겼을 때도 다음 자동 전환까지 온전히 한 간격을 기다리도록 타이머를 다시 건다
function restartRotation($) {
  if (rotation) rotation.cancel()
  rotation = $.clock.every(intervalMs, () => {
    if (!pinned) move($, 1)
  })
}

async function go($, step) {
  await move($, step)
  restartRotation($)
}

async function togglePin($) {
  pinned = !pinned
  $.ui.invalidate('ui.render')
  await $.store.set('pinned', pinned)
  if (!pinned) restartRotation($)
}

async function loadBundled($) {
  try {
    return JSON.parse(await $.fs.read($.plugin.root + '/phrases.json'))
  } catch {
    return null
  }
}

async function refresh($) {
  try {
    const res = await $.http.fetch(DATA_URL)
    if (!res.ok) return
    const list = JSON.parse(res.text)
    if (!Array.isArray(list) || !list.length) return
    setPhrases(list)
    await $.store.set('phrases', list)
    $.ui.invalidate('ui.render')
  } catch {
    // 오프라인이면 갖고 있는 목록을 그대로 쓴다
  }
}

function detail(p) {
  const lines = [`${p.ko}`, `→ ${p.en}`]
  for (const a of p.alt || []) lines.push(`  또는 ${a}`)
  if (p.example) lines.push('', `예문: ${p.example}`)
  if (p.exampleKo) lines.push(`      ${p.exampleKo}`)
  if (p.note) lines.push('', `💡 ${p.note}`)
  return lines.join('\n')
}

export function register(on, options) {
  intervalMs = Math.max(10, Number(options?.interval_seconds) || 60) * 1000
  shuffle = options?.shuffle === true

  on('session.start', async ($, e, next) => {
    const savedId = await $.store.get('currentId')
    if (typeof savedId === 'number') resumeId = savedId
    pinned = (await $.store.get('pinned')) === true

    const cached = await $.store.get('phrases')
    setPhrases(Array.isArray(cached) && cached.length ? cached : (await loadBundled($)) ?? [])

    restartRotation($)
    // 첫 프롬프트를 막지 않도록 최신 목록은 뒤에서 받아온다
    $.clock.after(0, () => refresh($))
    $.clock.every(REFRESH_MS, () => refresh($))

    try {
      await $.command.register({ name: 'biz', description: '지금 보이는 업무 영어 표현의 예문과 팁 보기' })
      await $.command.register({ name: 'biz-next', description: '다음 업무 영어 표현', immediate: true })
      await $.command.register({ name: 'biz-prev', description: '이전 업무 영어 표현', immediate: true })
      await $.command.register({ name: 'biz-pin', description: '지금 표현 고정 / 고정 해제', immediate: true })
    } catch {
      // 이름이 겹쳐 등록이 거부되어도 band 표시는 계속한다
    }
    return next(e)
  })

  on('command.run', { command: 'biz-next' }, async ($) => {
    await go($, 1)
    return {}
  })

  on('command.run', { command: 'biz-prev' }, async ($) => {
    await go($, -1)
    return {}
  })

  on('command.run', { command: 'biz-pin' }, async ($) => {
    await togglePin($)
    return {}
  })

  on('command.run', { command: 'biz' }, async () => {
    const p = current()
    return { text: p ? detail(p) : '표현 목록을 아직 불러오지 못했습니다.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const p = current()
    if (!p || e.props.hasSurvey) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const others = await next(e)
    const pos = order.indexOf(p.id) + 1

    let mine
    if (e.props.maxRows < 3) {
      // 자리가 좁으면 한 줄로
      mine = Text({ wrap: 'truncate', children: [Text({ bold: true, children: [p.ko] }), '  →  ', Text({ color: 'cyan', children: [p.en] })] })
    } else {
      mine = Box({
        flexDirection: 'column',
        children: [
          Text({ bold: true, wrap: 'truncate', children: ['📘 ', p.ko] }),
          Text({ color: 'cyan', wrap: 'truncate', children: ['   ', p.en] }),
          Box({
            flexDirection: 'row',
            columnGap: 2,
            children: [
              Text({ dimColor: true, children: [`   ${pos}/${order.length}${pinned ? ' 📌' : ''}`] }),
              Button({ key: 'biz-prev', label: '이전', hotkey: '1', plain: true, dimColor: true, onPress: () => go($, -1) }),
              Button({ key: 'biz-pin', label: pinned ? '고정 해제' : '고정', hotkey: '2', plain: true, dimColor: true, onPress: () => togglePin($) }),
              Button({ key: 'biz-next', label: '다음', hotkey: '3', plain: true, dimColor: true, onPress: () => go($, 1) }),
            ],
          }),
        ],
      })
    }

    return others ? Box({ flexDirection: 'column', children: [mine, others] }) : mine
  })
}

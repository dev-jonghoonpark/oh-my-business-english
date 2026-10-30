import { expect, mock, test } from 'claude-code/testing'

const LIST = [
  { id: 1, added: '2026-10-30', category: '회의·의견', ko: '심플하게 가보시죠', en: "Let's keep it simple." },
  { id: 2, added: '2026-10-30', category: '감사', ko: '확인 감사드립니다', en: 'Thanks for checking.' },
  { id: 3, added: '2026-10-30', category: '진행', ko: '바로 가겠습니다', en: "I'll be right there." },
]

const BAND = {
  plugin: 'oh-my-business-english',
  surface: 'terminal',
  component: 'AbovePrompt',
  viewport: { columns: 100, rows: 30 },
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

// session.start까지 띄워두고, 저장소를 Map으로 돌려준다
async function start($, on, { online = true, saved = {} as Record<string, unknown> } = {}) {
  const store = new Map<string, unknown>(Object.entries(saved))
  const clock = mock.clock(on)
  on('store.get', ($, e) => ({ value: store.get(e.key) }))
  on('store.set', ($, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('fs.read', () => ({ value: JSON.stringify(LIST.slice(0, 2)) }))
  on('http.fetch', () =>
    online ? { value: { status: 200, ok: true, headers: {}, text: JSON.stringify(LIST) } } : { deny: 'offline' },
  )
  on('command.register', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['other mod'] }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await clock.settle()
  return { store, clock }
}

test('최신 목록을 받아와서 첫 표현을 band에 보여준다', async ($, on) => {
  const { store } = await start($, on)
  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: /심플하게 가보시죠/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1\/3/ })).toBeDefined()
  expect((store.get('phrases') as unknown[]).length).toBe(3)
})

test('오프라인이면 플러그인에 들어 있는 phrases.json을 쓴다', async ($, on) => {
  await start($, on, { online: false })
  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: /1\/2/ })).toBeDefined()
})

test('1분마다 다음 표현으로 넘어가고, 끝에서 처음으로 돌아온다', async ($, on) => {
  const { clock, store } = await start($, on)
  await clock.advance(60_000)
  expect(store.get('currentId')).toBe(2)
  await clock.advance(120_000)
  expect(store.get('currentId')).toBe(1)
})

test('고정하면 자동으로 넘어가지 않는다', async ($, on) => {
  const { clock, store } = await start($, on)
  await $.command.run({ command: 'biz-pin', args: '' })
  await clock.advance(180_000)
  expect(store.get('currentId')).toBeUndefined()
  expect(store.get('pinned')).toBe(true)

  await $.command.run({ command: 'biz-pin', args: '' })
  await clock.advance(60_000)
  expect(store.get('currentId')).toBe(2)
})

test('명령과 band 버튼으로 앞뒤로 넘긴다', async ($, on) => {
  const { store } = await start($, on)
  await $.command.run({ command: 'biz-prev', args: '' })
  expect(store.get('currentId')).toBe(3)
  await $.command.run({ command: 'biz-next', args: '' })
  expect(store.get('currentId')).toBe(1)

  const ui = await $.ui.mount(BAND)
  await ui.press({ key: 'biz-next' })
  expect(store.get('currentId')).toBe(2)
  expect(await ui.find({ type: 'Text', text: /확인 감사드립니다/ })).toBeDefined()
  await ui.press({ key: 'biz-pin' })
  expect(await ui.find({ key: 'biz-pin' })).toMatchObject({ props: { label: '고정 해제' } })
})

test('수동으로 넘기면 다음 자동 전환까지 한 간격을 새로 기다린다', async ($, on) => {
  const { clock, store } = await start($, on)
  await clock.advance(50_000)
  await $.command.run({ command: 'biz-next', args: '' })
  await clock.advance(50_000)
  expect(store.get('currentId')).toBe(2)
  await clock.advance(10_000)
  expect(store.get('currentId')).toBe(3)
})

test('저장해둔 위치와 고정 상태에서 이어서 시작한다', async ($, on) => {
  await start($, on, { saved: { currentId: 3, pinned: true } })
  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: /바로 가겠습니다/ })).toBeDefined()
  expect(await ui.find({ key: 'biz-pin' })).toMatchObject({ props: { label: '고정 해제' } })
})

test('/biz는 예문과 팁까지 보여준다', async ($, on) => {
  await start($, on)
  const answer = await $.command.run({ command: 'biz', args: '' })
  expect(answer.text).toContain('심플하게 가보시죠')
  expect(answer.text).toContain("Let's keep it simple.")
})

test('설문이 band를 쓰고 있으면 비켜준다', async ($, on) => {
  await start($, on)
  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true } })
  expect(await ui.find({ type: 'Text', text: /심플하게/ })).toBeUndefined()
})

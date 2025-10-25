type Event = { time: string; text: string }
const historyStore = new Map<number, Event[]>()

export function getHistory(id: number): Event[] {
    return historyStore.get(id) ?? []
}

export function ensureInit(id: number) {
    if (!historyStore.has(id)) {
        historyStore.set(id, [{ time: new Date().toISOString(), text: "Added by crawling" }])
    }
}

export function addHistory(id: number, text: string) {
    const list = historyStore.get(id) ?? []
    list.push({ time: new Date().toISOString(), text })
    historyStore.set(id, list)
}
type Handler = (data: unknown) => void
const listeners = new Map<string, Set<Handler>>()

export const wsEvents = {
  on(type: string, handler: Handler): () => void {
    if (!listeners.has(type)) listeners.set(type, new Set())
    listeners.get(type)!.add(handler)
    return () => listeners.get(type)?.delete(handler)
  },
  emit(type: string, data: unknown) {
    listeners.get(type)?.forEach((h) => h(data))
  },
}

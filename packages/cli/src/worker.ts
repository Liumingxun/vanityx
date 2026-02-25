import type { Input, Options, Result, Stats } from 'vanityx'
import { searchVanity } from 'vanityx'

interface WorkerMessage {
  type: 'search'
  data: Input
}

type WorkerResponse = {
  type: 'result'
  data: Result
} | {
  type: 'progress'
  data: Stats
}

addEventListener('message', (ev: MessageEvent<WorkerMessage>) => {
  const { type, data } = ev.data
  if (type === 'search') {
    const options: Options = {
      onProgress: (stats) => {
        postMessage({ type: 'progress', data: stats } satisfies WorkerResponse)
      },
      progressInterval: 10_000,
    }

    const result = searchVanity(data, options)
    if (result) {
      postMessage({ type: 'result', data: result } satisfies WorkerResponse)
    }
  }
})

import type { SearchVanityInput, SearchVanityOptions, SearchVanityResult, SearchVanityStats } from 'vanityx'
import { searchVanity } from 'vanityx'

interface WorkerMessage {
  type: 'search'
  data: SearchVanityInput
}

type WorkerResponse = {
  type: 'result'
  data: SearchVanityResult
} | {
  type: 'progress'
  data: SearchVanityStats
}

addEventListener('message', (ev: MessageEvent<WorkerMessage>) => {
  const { type, data } = ev.data
  if (type === 'search') {
    const options: SearchVanityOptions = {
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

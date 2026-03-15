import type { Input, Result } from '@vanityx/core'

export interface SearchOptions {
  threads: number
  onProgress?: (stats: SearchProgress) => void
}

export interface SearchProgress {
  totalAttempts: number
  attemptsPerSec: number
}

interface WorkerStats {
  attempts: number
  timeMs: number
}

export async function searchWithWorkers(
  input: Input,
  options: SearchOptions,
): Promise<Result> {
  const { threads, onProgress } = options
  const workers: Worker[] = []
  const workerStats = new Map<number, WorkerStats>()
  let found = false

  return new Promise<Result>((resolve, reject) => {
    const getAggregateStats = (): SearchProgress => {
      let totalAttempts = 0
      let maxTime = 0

      for (const stat of workerStats.values()) {
        totalAttempts += stat.attempts
        maxTime = Math.max(maxTime, stat.timeMs)
      }

      const attemptsPerSec = maxTime > 0 ? (totalAttempts / maxTime) * 1000 : 0
      return { totalAttempts, attemptsPerSec }
    }

    const cleanup = () => {
      for (const w of workers) {
        w.terminate()
      }
    }

    const handleError = (workerId: number, err: unknown) => {
      cleanup()
      reject(new Error((err as { message: string }).message, { cause: {
        workerId,
        originalError: err,
      } }))
    }

    for (let i = 0; i < threads; i++) {
      const workerId = i
      const worker = new Worker('./src/worker.ts')

      worker.addEventListener('error', err => handleError(workerId, err))
      worker.addEventListener('messageerror', err => handleError(workerId, err))

      worker.addEventListener('message', (ev: MessageEvent) => {
        const { type, data } = ev.data

        if (type === 'progress') {
          workerStats.set(workerId, { attempts: data.attempts, timeMs: data.timeMs })
          if (onProgress) {
            onProgress(getAggregateStats())
          }
        }
        else if (type === 'result' && !found) {
          found = true
          cleanup()
          resolve(data)
        }
      })

      worker.postMessage({ type: 'search', data: input })
      workers.push(worker)
    }

    // Handle termination signals externally
  })
}

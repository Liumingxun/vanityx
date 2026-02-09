```ts
// 1. 超时控制
searchVanity({
  ...params,
  options: {
    onProgress: s => s.timeMs < 30_000
  }
})

// 2. 尝试次数限制
searchVanity({
  ...params,
  options: {
    onProgress: s => s.attempts < 1_000_000
  }
})

// 3. 进度条
searchVanity({
  ...params,
  options: {
    onProgress: (s) => {
      updateProgressBar(s.attemptsPerSec)
      return !userCanceled
    },
    progressInterval: 100
  }
})
```

import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['bin/index.ts'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/index.js',
  minify: false,
  sourcemap: 'inline',
  treeShaking: true,
})

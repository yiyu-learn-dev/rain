import { defineConfig, type Plugin } from 'vite'
import {
  backgroundTextureConfig,
  generateBackgroundTextures,
} from './scripts/generate-background-textures'

function backgroundTexturePipeline(): Plugin {
  return {
    name: 'background-texture-pipeline',
    async buildStart() {
      await generateBackgroundTextures(backgroundTextureConfig)
    },
    configureServer(server) {
      const source = backgroundTextureConfig.source
      const generatorScript = 'scripts/generate-background-textures.ts'
      const isSource = (changedPath: string) => changedPath.endsWith(source)
      const isGeneratorScript = (changedPath: string) => changedPath.endsWith(generatorScript)

      const regenerateAndReload = async (changedPath: string) => {
        if (!isSource(changedPath)) return
        await generateBackgroundTextures(backgroundTextureConfig)
        server.ws.send({
          type: 'full-reload',
          path: '*',
        })
      }

      const restartAndRegenerateForGeneratorChange = async (changedPath: string) => {
        if (!isGeneratorScript(changedPath)) return
        // Restart reloads this config and reruns buildStart, which regenerates
        // textures with the updated generator implementation/config.
        await server.restart()
      }

      server.watcher.add([source, generatorScript])
      server.watcher.on('add', regenerateAndReload)
      server.watcher.on('change', regenerateAndReload)
      server.watcher.on('change', restartAndRegenerateForGeneratorChange)
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [backgroundTexturePipeline()],
})

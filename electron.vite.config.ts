import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import {readFileSync} from 'node:fs'
import {VIDEO_RUNTIME_FILE,VIDEO_RUNTIME_SHA256,VIDEO_RUNTIME_SOURCE_DIGEST} from './src/main/work-mode/video-identity.generated'
import {createHash} from 'node:crypto'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(),{
      name:'dam-ai-worker-resources',
      buildStart(){
        this.emitFile({type:'asset',fileName:'eagle-companion/DAM-Eagle-Companion-0.2.0.eagleplugin',source:readFileSync(resolve(__dirname,'build/eagle-companion/DAM-Eagle-Companion-0.2.0.eagleplugin'))})
        if(process.platform==='win32'){
          const sourceDigest=createHash('sha256').update(Buffer.concat([readFileSync(resolve(__dirname,'src/main/work-mode/windows-video.cpp')),readFileSync(resolve(__dirname,'scripts/build-windows-video-runtime.mjs'))])).digest('hex')
          if(sourceDigest!==VIDEO_RUNTIME_SOURCE_DIGEST)throw Error('WINDOWS_VIDEO_SOURCE_REQUIRES_OFFLINE_REBUILD')
          const bytes=readFileSync(resolve(__dirname,'build/windows-video-runtime',VIDEO_RUNTIME_FILE))
          if(createHash('sha256').update(bytes).digest('hex')!==VIDEO_RUNTIME_SHA256)throw Error('WINDOWS_VIDEO_RUNTIME_CHANGED')
          this.emitFile({type:'asset',fileName:'windows-video/video.exe',source:bytes})
        }
        for(const name of ['local_ocr_worker.py','managed_vision_worker.py','retrieval_worker.py'])this.emitFile({type:'asset',fileName:`ai-service/tools/${name}`,source:readFileSync(resolve(__dirname,'ai-service/tools',name))})
        for(const name of ['astronaut.jpg','flag.jpg','NOTICE.md'])this.emitFile({type:'asset',fileName:`ai-service/tools/retrieval_probe/${name}`,source:readFileSync(resolve(__dirname,'ai-service/tools/retrieval_probe',name))})
      }
    }]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          'asset-card': resolve(__dirname, 'src/preload/asset-card.ts'),
          'work-window': resolve(__dirname, 'src/preload/work-window.ts')
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
          chunkFileNames: '[name].cjs',
          assetFileNames: '[name].[ext]'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer')
      }
    },
    plugins: [react()]
  }
})

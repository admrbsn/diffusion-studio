import './style.css'
import * as core from '@diffusionstudio/core'


class VideoEditor {
  constructor() {
    this.composition = null
    this.isPlaying = false
    this.currentTime = 0
    this.duration = 0 // Will be set from video source
    
    this.initializeComposition()
    this.setupControls()
    this.setupTimeline()
  }

  async initializeComposition() {
    try {
      console.log('🎬 Starting composition initialization...')
      
      // Create composition
      this.composition = new core.Composition()
      console.log('✅ Composition created')

      // Load video sources from public directory and URL
      console.log('📂 Loading video sources...')
      const videoSource1 = await core.Source.from('/jim_mcgrew (720p).mp4')
      console.log('✅ First video source loaded:', videoSource1)
      
      const videoSource2 = await core.Source.from('/Vaibhav.mp4')
      console.log('✅ Second video source loaded:', videoSource2)
      
      console.log('🌐 Loading third video from Vimeo URL...')
      const videoSource3 = await core.Source.from('https://player.vimeo.com/progressive_redirect/playback/1098560016/rendition/720p/file.mp4?loc=external&signature=27531e28a53029453965f9a407132eb22d10e2325b9ffb7490ddf8dabc6a0212')
      console.log('✅ Third video source loaded from Vimeo URL:', videoSource3)
      
      console.log('🖼️ Loading image source...')
      const imageSource = await core.Source.from('https://images.pexels.com/photos/32440659/pexels-photo-32440659.jpeg')
      console.log('✅ Image source loaded:', imageSource)
      
      console.log('🎵 Loading audio source...')
      const audioSource = await core.Source.from('/future-design-344320.mp3')
      console.log('✅ Audio source loaded:', audioSource)
      
      console.log('🎵 Loading second audio source...')
      const audioSource2 = await core.Source.from('/embrace-364091.mp3')
      console.log('✅ Second audio source loaded:', audioSource2)

      // Calculate total duration from all three videos plus image
      const video1Duration = videoSource1.duration?.seconds ?? 10
      const video2Duration = videoSource2.duration?.seconds ?? 10
      const video3Duration = videoSource3.duration?.seconds ?? 10
      const imageDuration = 5  // 5 seconds for the image
      this.duration = video1Duration + video2Duration + imageDuration + video3Duration
      
      // DEBUGGING: Log all duration calculations
      console.log('🔍 DEBUGGING DURATIONS:')
      console.log(`  Video 1 duration: ${video1Duration}s`)
      console.log(`  Image duration: ${imageDuration}s`) 
      console.log(`  Video 2 duration: ${video2Duration}s`)
      console.log(`  Video 3 duration: ${video3Duration}s`)
      console.log(`  TOTAL calculated duration: ${this.duration}s`)
      
      // Set composition duration manually since we're not using sequential mode
      const fps = 30  // Use consistent 30fps for all calculations
      const totalFrames = this.duration * fps
      this.composition.duration = totalFrames + 'f'  // Use frames format instead of seconds
      console.log(`  Composition duration set to: ${totalFrames} frames (${this.duration}s at ${fps}fps)`)
      console.log(`⏱️ Total duration calculated: ${this.duration}s (Video 1: ${video1Duration}s + Image: ${imageDuration}s + Video 2: ${video2Duration}s + Video 3: ${video3Duration}s)`)

      // DEBUGGING: Calculate simple sequential delays (no transitions/offsets)
      const video1Delay = 0
      const imageDelay = video1Duration
      const video2Delay = video1Duration + imageDuration
      const video3Delay = video1Duration + imageDuration + video2Duration
      
      // Convert delays to frames
      const video1DelayFrames = video1Delay * fps
      const imageDelayFrames = imageDelay * fps
      const video2DelayFrames = video2Delay * fps
      const video3DelayFrames = video3Delay * fps
      
      console.log('🔍 DEBUGGING DELAYS (simple sequential):')
      console.log(`  Video 1 delay: ${video1Delay}s = ${video1DelayFrames} frames`)
      console.log(`  Image delay: ${imageDelay}s = ${imageDelayFrames} frames`)
      console.log(`  Video 2 delay: ${video2Delay}s = ${video2DelayFrames} frames`)
      console.log(`  Video 3 delay: ${video3Delay}s = ${video3DelayFrames} frames`)
      
      const videoClip1 = new core.VideoClip(videoSource1, {
        height: '100%',
        position: 'center',
        delay: video1DelayFrames + 'f'
      }).subclip(0, video1Duration * fps)
      console.log(`📹 First video clip created: delay=${video1DelayFrames}f (${video1Delay}s), subclip=0-${video1Duration * fps} frames`)

      const imageClip = new core.ImageClip(imageSource, {
        height: '100%',
        position: 'center',
        delay: imageDelayFrames + 'f',
        duration: '5s'
      })
      console.log(`🖼️ Image clip created: delay=${imageDelayFrames}f (${imageDelay}s), duration=5s`)

      const videoClip2 = new core.VideoClip(videoSource2, {
        height: '100%',
        position: 'center',
        delay: video2DelayFrames + 'f'
      }).subclip(0, video2Duration * fps)
      console.log(`📹 Second video clip created: delay=${video2DelayFrames}f (${video2Delay}s), subclip=0-${video2Duration * fps} frames`)

      const videoClip3 = new core.VideoClip(videoSource3, {
        height: '100%',
        position: 'center',
        delay: video3DelayFrames + 'f'
      }).subclip(0, video3Duration * fps)
      console.log(`📹 Third video clip created: delay=${video3DelayFrames}f (${video3Delay}s), subclip=0-${video3Duration * fps} frames`)

      // Create audio clip with source (reduced volume)
      const audioClip = new core.AudioClip(audioSource, {
        volume: 0.3  // 30% volume to not overpower video audio
      })
      console.log('🔊 Audio clip created with reduced volume')
      
      // Create second audio clip to play after first audio ends
      const audio1Duration = audioSource.duration?.seconds ?? 180  // Fallback to 3 minutes if duration not available
      const audio2Delay = audio1Duration
      const audio2DelayFrames = audio2Delay * fps
      
      const audioClip2 = new core.AudioClip(audioSource2, {
        volume: 0.3,  // Same volume as first audio
        delay: audio2DelayFrames + 'f'  // Start after first audio ends
      })
      console.log(`🔊 Second audio clip created: delay=${audio2DelayFrames}f (${audio2Delay}s), starts after first audio`)
      console.log(`🎵 Audio sequence: first audio (0-${audio1Duration}s) → second audio (${audio2Delay}s+)`)

      // Create separate layers using createLayer and set proper ordering
      const videoLayer1 = this.composition.createLayer()
      const imageLayer = this.composition.createLayer()
      const videoLayer2 = this.composition.createLayer()
      const videoLayer3 = this.composition.createLayer()
      const audioLayer = this.composition.createLayer()
      console.log('🎛️ Individual layers created via createLayer()')

      // Set layer ordering (lower index = rendered on top)
      videoLayer1.index(0)  // First video on top
      imageLayer.index(1)   // Image layer
      videoLayer2.index(2)  // Second video
      videoLayer3.index(3)  // Third video
      audioLayer.index(4)   // Audio at bottom
      console.log('🔢 Layer ordering attempted with .index()')
      
      // DEBUGGING: Try different ways to check layer indices
      console.log('🔍 DEBUGGING LAYER INDICES:')
      console.log(`  videoLayer1.index(): ${JSON.stringify(videoLayer1.index())}`)
      console.log(`  imageLayer.index(): ${JSON.stringify(imageLayer.index())}`)
      console.log(`  videoLayer2.index(): ${JSON.stringify(videoLayer2.index())}`)
      console.log(`  videoLayer3.index(): ${JSON.stringify(videoLayer3.index())}`)
      console.log(`  audioLayer.index(): ${JSON.stringify(audioLayer.index())}`)
      
      // Try alternative: just use the layers in the order we want them rendered
      console.log('🔍 LAYER CREATION ORDER (may determine rendering order):')
      console.log(`  videoLayer1 created first`)
      console.log(`  imageLayer created second`)
      console.log(`  videoLayer2 created third`)
      console.log(`  videoLayer3 created fourth`)
      console.log(`  audioLayer created fifth`)

      // Add each clip to its respective layer with calculated delays
      await videoLayer1.add(videoClip1)  // First video (starts at 0)
      await imageLayer.add(imageClip)    // Image (starts after first video)
      await videoLayer2.add(videoClip2)  // Second video (starts after image)
      await videoLayer3.add(videoClip3)  // Third video (starts after second video)
      console.log('✅ All clips added to their respective layers')
      
      // DEBUGGING: Log what's in each layer
      console.log('🔍 DEBUGGING LAYER CONTENTS:')
      console.log(`  videoLayer1 clips: ${videoLayer1.clips.length}`)
      console.log(`  imageLayer clips: ${imageLayer.clips.length}`)
      console.log(`  videoLayer2 clips: ${videoLayer2.clips.length}`)
      console.log(`  videoLayer3 clips: ${videoLayer3.clips.length}`)

      // Add audio clip to its layer
      await audioLayer.add(audioClip)  // Audio track
      console.log('✅ Audio clip added to layer')
      console.log(`  audioLayer clips: ${audioLayer.clips.length}`)
      
      // Add second audio clip to the same layer
      await audioLayer.add(audioClip2)  // Second audio track
      console.log('✅ Second audio clip added to layer')
      console.log(`  audioLayer clips: ${audioLayer.clips.length} (both audio files)`)

      // Mount composition to player (like working example)
      const player = document.getElementById('player')
      this.composition.mount(player)
      console.log('🖥️ Composition mounted to player')
      
      // Setup composition event listeners
      this.setupCompositionEvents()
      
      // Update UI with new duration
      this.updateTimeDisplay()
      this.updateTimeline()
      
      console.log(`🎉 Composition with three videos + one image + two audio tracks loaded (sequential, no transitions): ${this.duration}s total duration`)
      
      // DEBUGGING: Final composition state
      console.log('🔍 FINAL COMPOSITION STATE:')
      console.log(`  Composition duration: ${this.composition.duration}`)
      console.log(`  Total layers: ${this.composition.layers ? this.composition.layers.length : 'unknown'}`)
      console.log(`  Clean sequential timeline:`)
      console.log(`    Video1: ${video1Delay}s - ${video1Duration}s`)
      console.log(`    Image: ${imageDelay}s - ${imageDelay + imageDuration}s`)
      console.log(`    Video2: ${video2Delay}s - ${video2Delay + video2Duration}s`)
      console.log(`    Video3: ${video3Delay}s - ${video3Delay + video3Duration}s`)
      console.log(`  Audio sequence:`)
      console.log(`    Audio1 (future-design): 0s - ${audio1Duration}s`)
      console.log(`    Audio2 (embrace): ${audio2Delay}s onwards`)
      console.log(`  📺 Clean cuts between segments (no transitions)`)
      console.log('🔍 Ready to test playback!')
      
    } catch (error) {
      console.error('❌ Error initializing composition:', error)
      console.error('Error details:', error.stack)
    }
  }

  setupCompositionEvents() {
    // Listen to composition events (like working example)
    this.composition.on('play', () => {
      console.log('🔍 COMPOSITION EVENT: play')
      this.isPlaying = true
      this.updatePlayPauseButtons()
    })
    
    this.composition.on('pause', () => {
      console.log('🔍 COMPOSITION EVENT: pause')
      this.isPlaying = false
      this.updatePlayPauseButtons()
    })
    
    this.composition.on('currentframe', (evt) => {
      // Update current time from composition
      const frame = evt.detail
      const totalFrames = this.composition.duration.frames
      this.currentTime = frame / totalFrames * this.duration
      
      // Debug every 30 frames (1 second at 30fps)
      if (frame % 30 === 0) {
        console.log(`🔍 PLAYBACK: frame ${frame}/${totalFrames}, time ${this.currentTime.toFixed(2)}s/${this.duration}s`)
      }
      
      this.updateTimeDisplay()
      this.updateTimeline()
    })
  }

  setupControls() {
    const playBtn = document.querySelector('[data-lucide="play"]')
    const pauseBtn = document.querySelector('[data-lucide="pause"]')
    const skipBackBtn = document.querySelector('[data-lucide="skip-back"]')
    const skipForwardBtn = document.querySelector('[data-lucide="skip-forward"]')
    const exportBtn = document.getElementById('export')

    playBtn.addEventListener('click', () => this.play())
    pauseBtn.addEventListener('click', () => this.pause())
    skipBackBtn.addEventListener('click', () => this.skipBack())
    skipForwardBtn.addEventListener('click', () => this.skipForward())
    exportBtn.addEventListener('click', () => this.export())
  }

  setupTimeline() {
    const timeline = document.getElementById('timeline')
    timeline.addEventListener('click', async (e) => {
      const rect = timeline.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = clickX / rect.width
      await this.seek(percentage * this.duration)
    })
  }

  play() {
    if (this.composition && !this.isPlaying) {
      this.composition.play()
    }
  }

  pause() {
    if (this.composition && this.isPlaying) {
      this.composition.pause()
    }
  }

  skipBack() {
    this.seek(Math.max(0, this.currentTime - 5))
  }

  skipForward() {
    this.seek(Math.min(this.duration, this.currentTime + 5))
  }

  async seek(time) {
    if (this.composition) {
      this.currentTime = Math.max(0, Math.min(this.duration, time))
      // Convert time to frame and seek composition
      const frame = (this.currentTime / this.duration) * this.composition.duration.frames
      this.composition.seek(frame)
    }
  }

  updatePlayPauseButtons() {
    const playBtn = document.querySelector('[data-lucide="play"]')
    const pauseBtn = document.querySelector('[data-lucide="pause"]')
    
    if (this.isPlaying) {
      playBtn.style.display = 'none'
      pauseBtn.style.display = 'block'
    } else {
      pauseBtn.style.display = 'none'
      playBtn.style.display = 'block'
    }
  }

  updateTimeDisplay() {
    const timeElement = document.getElementById('time')
    if (timeElement) {
      timeElement.textContent = `${this.formatTime(this.currentTime)} / ${this.formatTime(this.duration)}`
    }
  }

  updateTimeline() {
    const timelineProgress = document.querySelector('#timeline > div')
    if (timelineProgress && this.duration > 0) {
      const percentage = (this.currentTime / this.duration) * 100
      timelineProgress.style.width = `${Math.min(100, Math.max(0, percentage))}%`
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  async export() {
    const exportBtn = document.getElementById('export')
    const loader = exportBtn.querySelector('.loader')
    const progress = document.getElementById('progress')
    
    try {
      exportBtn.disabled = true
      loader.style.display = 'block'
      progress.style.display = 'flex'
      
      // Create encoder with progress callback (like working example)
      const encoder = new core.Encoder(this.composition, { debug: true })
      
      // Listen to render progress
      encoder.on('render', (event) => {
        const { progress: renderProgress, total } = event.detail
        const percentage = Math.round(renderProgress * 100 / total)
        progress.querySelector('h1').textContent = `${percentage}%`
      })
      
      await encoder.render('composition-export.mp4')
      
      progress.querySelector('h1').textContent = '100%'
      
      setTimeout(() => {
        progress.style.display = 'none'
        exportBtn.disabled = false
        loader.style.display = 'none'
      }, 1000)
      
    } catch (error) {
      console.error('Export failed:', error)
      progress.style.display = 'none'
      exportBtn.disabled = false
      loader.style.display = 'none'
      alert(`Export failed: ${error.message}`)
    }
  }
}

// Initialize the app
function initializeApp() {
  console.log('Diffusion Studio Video Editor initialized')
  new VideoEditor()
}

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  initializeApp()
} 
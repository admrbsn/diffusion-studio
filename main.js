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

      // Load video sources from public directory
      console.log('📂 Loading video sources...')
      const videoSource1 = await core.Source.from('/jim_mcgrew (720p).mp4')
      console.log('✅ First video source loaded:', videoSource1)
      
      const videoSource2 = await core.Source.from('/Vaibhav.mp4')
      console.log('✅ Second video source loaded:', videoSource2)
      
      console.log('🎵 Loading audio source...')
      const audioSource = await core.Source.from('/future-design-344320.mp3')
      console.log('✅ Audio source loaded:', audioSource)

      // Calculate total duration from both videos
      const video1Duration = videoSource1.duration?.seconds ?? 10
      const video2Duration = videoSource2.duration?.seconds ?? 10
      this.duration = video1Duration + video2Duration
      
      // The composition duration will be automatically set by the sequential layer
      // when we add the clips, so we don't need to set it manually
      console.log(`⏱️ Total duration calculated: ${this.duration}s (Video 1: ${video1Duration}s + Video 2: ${video2Duration}s)`)

      // Create video clips
      const videoClip1 = new core.VideoClip(videoSource1, {
        height: '100%',
        position: 'center'
      })
      console.log('📹 First video clip created')

      const videoClip2 = new core.VideoClip(videoSource2, {
        height: '100%',
        position: 'center'
      })
      console.log('📹 Second video clip created')

      // Create audio clip with source (reduced volume)
      const audioClip = new core.AudioClip(audioSource, {
        volume: 0.3  // 30% volume to not overpower video audio
      })
      console.log('🔊 Audio clip created with reduced volume')

      // Add title text overlay for the entire duration
      const title = new core.TextClip({
        text: 'Diffusion Studio',
        fontSize: 64,
        fill: { color: '#ffffff' },
        stroke: { color: '#000000', width: 2 },
        position: 'center',
        duration: this.duration
      })
      console.log('📝 Text clip created')

      // Create layers
      const videoLayer = this.composition.createLayer()
      const audioLayer = this.composition.createLayer()
      const textLayer = this.composition.createLayer()
      console.log('🎛️ Layers created')

      // Enable sequential mode on video layer for automatic sequencing
      videoLayer.sequential()
      console.log('🔄 Sequential mode enabled on video layer')

      // Add video clips to video layer (they will play sequentially)
      await videoLayer.add(videoClip1)  // First video
      await videoLayer.add(videoClip2)  // Second video (will start after first ends)
      console.log('✅ Both video clips added to sequential layer')

      // Add other clips to their respective layers
      await audioLayer.add(audioClip)  // Audio track
      await textLayer.add(title)       // Text overlay on top
      console.log('✅ Audio and text clips added to layers')

      // Mount composition to player (like working example)
      const player = document.getElementById('player')
      this.composition.mount(player)
      console.log('🖥️ Composition mounted to player')
      
      // Setup composition event listeners
      this.setupCompositionEvents()
      
      // Update UI with new duration
      this.updateTimeDisplay()
      this.updateTimeline()
      
      console.log(`🎉 Sequential composition loaded: ${this.duration}s total duration`)
      
    } catch (error) {
      console.error('❌ Error initializing composition:', error)
      console.error('Error details:', error.stack)
    }
  }

  setupCompositionEvents() {
    // Listen to composition events (like working example)
    this.composition.on('play', () => {
      this.isPlaying = true
      this.updatePlayPauseButtons()
    })
    
    this.composition.on('pause', () => {
      this.isPlaying = false
      this.updatePlayPauseButtons()
    })
    
    this.composition.on('currentframe', (evt) => {
      // Update current time from composition
      this.currentTime = evt.detail / this.composition.duration.frames * this.duration
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
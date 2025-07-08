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

      // Define media sources in arrays (easier to transition to JSON later)
      const videoSources = [
        '/jim_mcgrew (720p).mp4',
        '/Vaibhav.mp4',
        'https://player.vimeo.com/progressive_redirect/playback/1098560016/rendition/720p/file.mp4?loc=external&signature=27531e28a53029453965f9a407132eb22d10e2325b9ffb7490ddf8dabc6a0212'
      ]
      
      const imageSources = [
        'https://images.pexels.com/photos/32440659/pexels-photo-32440659.jpeg'
      ]
      
      const audioSources = [
        '/future-design-344320.mp3',
        '/embrace-364091.mp3'
      ]
      
      // Load all video sources
      console.log('📂 Loading video sources...')
      const loadedVideoSources = []
      for (let i = 0; i < videoSources.length; i++) {
        const videoSource = await core.Source.from(videoSources[i])
        loadedVideoSources.push(videoSource)
        console.log(`✅ Video ${i + 1} source loaded:`, videoSource)
      }
      
      // Load all image sources
      console.log('🖼️ Loading image sources...')
      const loadedImageSources = []
      for (let i = 0; i < imageSources.length; i++) {
        const imageSource = await core.Source.from(imageSources[i])
        loadedImageSources.push(imageSource)
        console.log(`✅ Image ${i + 1} source loaded:`, imageSource)
      }
      
      // Load all audio sources
      console.log('🎵 Loading audio sources...')
      const loadedAudioSources = []
      for (let i = 0; i < audioSources.length; i++) {
        const audioSource = await core.Source.from(audioSources[i])
        loadedAudioSources.push(audioSource)
        console.log(`✅ Audio ${i + 1} source loaded:`, audioSource)
      }
      
      // Calculate total duration dynamically from all loaded sources
      const videoDurations = loadedVideoSources.map(source => source.duration?.seconds ?? 10)
      const imageDurations = [5] // 5 seconds for the image (could be from source later)
      const totalVideoDuration = videoDurations.reduce((sum, duration) => sum + duration, 0)
      const totalImageDuration = imageDurations.reduce((sum, duration) => sum + duration, 0)
      this.duration = totalVideoDuration + totalImageDuration
      
      // DEBUGGING: Log all duration calculations
      console.log('🔍 DEBUGGING DURATIONS:')
      videoDurations.forEach((duration, index) => {
        console.log(`  Video ${index + 1} duration: ${duration}s`)
      })
      imageDurations.forEach((duration, index) => {
        console.log(`  Image ${index + 1} duration: ${duration}s`)
      })
      console.log(`  TOTAL calculated duration: ${this.duration}s`)
      
      // Set composition duration manually since we're not using sequential mode
      const fps = 30  // Use consistent 30fps for all calculations
      const totalFrames = this.duration * fps
      this.composition.duration = totalFrames + 'f'  // Use frames format instead of seconds
      console.log(`  Composition duration set to: ${totalFrames} frames (${this.duration}s at ${fps}fps)`)
      console.log(`⏱️ Total duration calculated: ${this.duration}s`)

      // Calculate sequential delays dynamically
      const allMediaItems = []
      let currentDelay = 0
      
      // Add videos and images in sequence (interleaved based on our current setup)
      const mediaSequence = [
        { type: 'video', sourceIndex: 0, duration: videoDurations[0] },
        { type: 'image', sourceIndex: 0, duration: imageDurations[0] },
        { type: 'video', sourceIndex: 1, duration: videoDurations[1] },
        { type: 'video', sourceIndex: 2, duration: videoDurations[2] }
      ]
      
      console.log('🔍 DEBUGGING DELAYS (dynamic sequential):')
      
      // Create video clips dynamically
      const videoClips = []
      const videoLayers = []
      let videoIndex = 0
      
      // Create image clips dynamically  
      const imageClips = []
      const imageLayers = []
      let imageIndex = 0
      
      // Process each media item in sequence
      for (let i = 0; i < mediaSequence.length; i++) {
        const mediaItem = mediaSequence[i]
        const delayFrames = currentDelay * fps
        
        if (mediaItem.type === 'video') {
          const source = loadedVideoSources[mediaItem.sourceIndex]
          const layer = this.composition.createLayer()
          
          const clip = new core.VideoClip(source, {
            height: '100%',
            position: 'center',
            delay: delayFrames + 'f'
          }).subclip(0, mediaItem.duration * fps)
          
          videoClips.push(clip)
          videoLayers.push(layer)
          
          console.log(`  Video ${videoIndex + 1} delay: ${currentDelay}s = ${delayFrames} frames`)
          console.log(`📹 Video ${videoIndex + 1} clip created: delay=${delayFrames}f (${currentDelay}s), subclip=0-${mediaItem.duration * fps} frames`)
          videoIndex++
          
        } else if (mediaItem.type === 'image') {
          const source = loadedImageSources[mediaItem.sourceIndex]
          const layer = this.composition.createLayer()
          
          const clip = new core.ImageClip(source, {
            height: '100%',
            position: 'center',
            delay: delayFrames + 'f',
            duration: mediaItem.duration + 's'
          })
          
          imageClips.push(clip)
          imageLayers.push(layer)
          
          console.log(`  Image ${imageIndex + 1} delay: ${currentDelay}s = ${delayFrames} frames`)
          console.log(`🖼️ Image ${imageIndex + 1} clip created: delay=${delayFrames}f (${currentDelay}s), duration=${mediaItem.duration}s`)
          imageIndex++
        }
        
        currentDelay += mediaItem.duration
      }
      
      // Create audio clips dynamically
      const audioClips = []
      let audioDelay = 0
      
      for (let i = 0; i < loadedAudioSources.length; i++) {
        const source = loadedAudioSources[i]
        const delayFrames = audioDelay * fps
        
        const clip = new core.AudioClip(source, {
          volume: 0.3,  // 30% volume to not overpower video audio
          delay: i === 0 ? 0 : delayFrames + 'f'  // First audio starts immediately, others delayed
        })
        
        audioClips.push(clip)
        console.log(`🔊 Audio ${i + 1} clip created: delay=${delayFrames}f (${audioDelay}s), volume=30%`)
        
        // Update delay for next audio (if any)
        if (i === 0) {
          audioDelay = source.duration?.seconds ?? 180
          console.log(`🎵 Audio sequence: Audio ${i + 1} (0-${audioDelay}s)`)
        } else {
          const nextDelay = audioDelay + (source.duration?.seconds ?? 180)
          console.log(`🎵 Audio sequence: Audio ${i + 1} (${audioDelay}s+)`)
          audioDelay = nextDelay
        }
      }

      // Create audio layer and add all audio clips
      const audioLayer = this.composition.createLayer()
      
      // Set layer ordering for all dynamic layers
      console.log('🔢 Setting layer ordering:')
      for (let i = 0; i < videoLayers.length; i++) {
        videoLayers[i].index(i)
        console.log(`  Video layer ${i + 1} index: ${i}`)
      }
      for (let i = 0; i < imageLayers.length; i++) {
        imageLayers[i].index(videoLayers.length + i)
        console.log(`  Image layer ${i + 1} index: ${videoLayers.length + i}`)
      }
      audioLayer.index(videoLayers.length + imageLayers.length)
      console.log(`  Audio layer index: ${videoLayers.length + imageLayers.length}`)

      // Add all clips to their respective layers
      for (let i = 0; i < videoClips.length; i++) {
        await videoLayers[i].add(videoClips[i])
        console.log(`✅ Video ${i + 1} clip added to layer`)
      }
      
      for (let i = 0; i < imageClips.length; i++) {
        await imageLayers[i].add(imageClips[i])
        console.log(`✅ Image ${i + 1} clip added to layer`)
      }
      
      for (let i = 0; i < audioClips.length; i++) {
        await audioLayer.add(audioClips[i])
        console.log(`✅ Audio ${i + 1} clip added to layer`)
      }
      
      console.log(`✅ All clips added: ${videoClips.length} videos, ${imageClips.length} images, ${audioClips.length} audio tracks`)
      
      // DEBUGGING: Log what's in each layer
      console.log('🔍 DEBUGGING LAYER CONTENTS:')
      for (let i = 0; i < videoLayers.length; i++) {
        console.log(`  videoLayer${i + 1} clips: ${videoLayers[i].clips.length}`)
      }
      for (let i = 0; i < imageLayers.length; i++) {
        console.log(`  imageLayer${i + 1} clips: ${imageLayers[i].clips.length}`)
      }
      console.log(`  audioLayer clips: ${audioLayer.clips.length}`)

      // Mount composition to player (like working example)
      const player = document.getElementById('player')
      this.composition.mount(player)
      console.log('🖥️ Composition mounted to player')
      
      // Setup composition event listeners
      this.setupCompositionEvents()
      
      // Update UI with new duration
      this.updateTimeDisplay()
      this.updateTimeline()
      
      console.log(`🎉 Dynamic composition loaded: ${videoClips.length} videos + ${imageClips.length} images + ${audioClips.length} audio tracks (${this.duration}s total duration)`)
      
      // DEBUGGING: Final composition state
      console.log('🔍 FINAL COMPOSITION STATE:')
      console.log(`  Composition duration: ${this.composition.duration}`)
      console.log(`  Total layers: ${videoLayers.length + imageLayers.length + 1} (${videoLayers.length} video, ${imageLayers.length} image, 1 audio)`)
      console.log(`  Dynamic sequential timeline:`)
      
      // Show timeline based on media sequence
      let timelineDelay = 0
      for (let i = 0; i < mediaSequence.length; i++) {
        const mediaItem = mediaSequence[i]
        const endTime = timelineDelay + mediaItem.duration
        console.log(`    ${mediaItem.type.charAt(0).toUpperCase() + mediaItem.type.slice(1)}${mediaItem.sourceIndex + 1}: ${timelineDelay}s - ${endTime}s`)
        timelineDelay = endTime
      }
      
      console.log(`  Audio sequence:`)
      for (let i = 0; i < audioClips.length; i++) {
        const startTime = i === 0 ? 0 : (loadedAudioSources[0].duration?.seconds ?? 180)
        const audioDuration = loadedAudioSources[i].duration?.seconds ?? 'unknown'
        console.log(`    Audio${i + 1}: ${startTime}s - ${startTime + audioDuration}s`)
      }
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
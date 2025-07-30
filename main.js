import './style.css'
import * as core from '@diffusionstudio/core'


class VideoEditor {
  constructor() {
    this.composition = null
    this.isPlaying = false
    this.currentTime = 0
    this.duration = 0 // Will be set from video source
    
    // Detect mobile and set muted state
    this.isMobile = this.detectMobile()
    this.isMuted = this.isMobile // Mute by default on mobile
    
    console.log(`📱 Mobile detected: ${this.isMobile}, Starting muted: ${this.isMuted}`)
    
    // Show loading overlay
    this.showLoadingOverlay('Initializing...')
    
    this.initializeComposition()
    this.setupControls()
    this.setupTimeline()
  }

  showLoadingOverlay(status = 'Loading...') {
    const overlay = document.getElementById('loading-overlay')
    const statusElement = document.getElementById('loading-status')
    
    if (statusElement) {
      statusElement.textContent = status
    }
    
    if (overlay) {
      overlay.classList.remove('hidden')
    }
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay')
    
    if (overlay) {
      overlay.classList.add('hidden')
    }
  }

  updateLoadingStatus(status) {
    const statusElement = document.getElementById('loading-status')
    
    if (statusElement) {
      statusElement.textContent = status
    }
  }

  detectMobile() {
    // Detect mobile devices
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isSmallScreen = window.innerWidth <= 768
    
    return isMobileUA || (isTouchDevice && isSmallScreen)
  }

  async initializeComposition() {
    try {
      console.log('🎬 Starting composition initialization...')
      this.updateLoadingStatus('Creating composition...')
      
      // Create composition with WebGL2 backend attempt
      try {
        this.composition = new core.Composition({ backend: 'webgl' })
        console.log('✅ Composition created with WebGL2 backend')
      } catch (error) {
        console.log('⚠️ WebGL2 backend failed, trying webgl2...')
        try {
          this.composition = new core.Composition({ backend: 'webgl2' })
          console.log('✅ Composition created with webgl2 backend')
        } catch (error2) {
          console.log('⚠️ WebGL backends failed, falling back to default...')
          this.composition = new core.Composition()
          console.log('✅ Composition created with default backend')
        }
      }

      // Load media configuration from JSON file
      console.log('📄 Loading media configuration...')
      this.updateLoadingStatus('Loading media configuration...')
      const response = await fetch('/media-config.json')
      
      if (!response.ok) {
        throw new Error(`Failed to load media-config.json: ${response.status} ${response.statusText}`)
      }
      
      const mediaConfig = await response.json()
      console.log('✅ Media configuration loaded:', mediaConfig.id)
      
      // Process media items based on playlist order
      const playlistItems = mediaConfig.playlist.map(id => ({
        id,
        ...mediaConfig.media[id]
      }))
      
      console.log('🎬 Playlist sequence:', playlistItems.map(item => `${item.type}(${item.id})`).join(' → '))
      
      // Separate video and image sources from playlist
      const videoSources = []
      const imageSources = []
      
      playlistItems.forEach(item => {
        if (item.type === 'video') {
          videoSources.push(item.video)
        } else if (item.type === 'img') {
          imageSources.push(item.img)
        }
      })
      
      // Audio sources from tracks (in order)
      const audioSources = mediaConfig.tracks.map(track => track.src)
      
      console.log('📋 Processed sources:')
      console.log(`  Videos: ${videoSources.length}`, videoSources)
      console.log(`  Images: ${imageSources.length}`, imageSources)
      console.log(`  Audio: ${audioSources.length}`, audioSources)
      
      // Load all video sources
      console.log('📂 Loading video sources...')
      this.updateLoadingStatus(`Loading ${videoSources.length} videos...`)
      const loadedVideoSources = []
      
      for (let i = 0; i < videoSources.length; i++) {
        this.updateLoadingStatus(`Loading videos ${i + 1}/${videoSources.length}...`)
        
        const videoSource = await core.Source.from(videoSources[i], { prefetch: true })
        loadedVideoSources.push(videoSource)
      }
      console.log(`✅ ${loadedVideoSources.length} video sources loaded`)
      
      // Load all image sources
      console.log('🖼️ Loading image sources...')
      this.updateLoadingStatus(`Loading ${imageSources.length} images...`)
      const loadedImageSources = []
      for (let i = 0; i < imageSources.length; i++) {
        this.updateLoadingStatus(`Loading images ${i + 1}/${imageSources.length}...`)
        const imageSource = await core.Source.from(imageSources[i], { prefetch: true })
        loadedImageSources.push(imageSource)
      }
      console.log(`✅ ${loadedImageSources.length} image sources loaded`)
      
      // Load all audio sources
      console.log('🎵 Loading audio sources...')
      this.updateLoadingStatus(`Loading ${audioSources.length} audio tracks...`)
      const loadedAudioSources = []
      for (let i = 0; i < audioSources.length; i++) {
        this.updateLoadingStatus(`Loading audio tracks ${i + 1}/${audioSources.length}...`)
        const audioSource = await core.Source.from(audioSources[i], { prefetch: true })
        loadedAudioSources.push(audioSource)
      }
      console.log(`✅ ${loadedAudioSources.length} audio sources loaded`)
      
      // Calculate total duration dynamically from all loaded sources
      const videoDurations = loadedVideoSources.map((source, index) => {
        const duration = source.duration?.seconds
        const isValid = duration && isFinite(duration) && duration > 0
        
        if (!isValid) {
          console.log(`⚠️ Video ${index + 1} has invalid duration (${duration}), using fallback of 10s`)
        }
        
        return isValid ? duration : 10
      })
      
      // Get image durations from JSON config (now using integers)
      const imageDurations = []
      let imageDurationIndex = 0
      playlistItems.forEach(item => {
        if (item.type === 'img') {
          const duration = item.duration || 5  // Default to 5 seconds if not specified
          imageDurations.push(duration)
          imageDurationIndex++
        }
      })
      
      const totalVideoDuration = videoDurations.reduce((sum, duration) => sum + duration, 0)
      const totalImageDuration = imageDurations.reduce((sum, duration) => sum + duration, 0)
      this.duration = totalVideoDuration + totalImageDuration
      
      console.log(`⏱️ Total composition duration: ${this.duration}s`)
      
      // Set composition duration manually since we're not using sequential mode
      const fps = 30  // Use consistent 30fps for all calculations
      const totalFrames = this.duration * fps
      this.composition.duration = totalFrames + 'f'  // Use frames format instead of seconds
      console.log(`  Composition duration set to: ${totalFrames} frames (${this.duration}s at ${fps}fps)`)
      console.log(`⏱️ Total duration calculated: ${this.duration}s`)

      // Build media sequence from playlist order
      const mediaSequence = []
      let videoSourceIndex = 0
      let imageSourceIndex = 0
      
      playlistItems.forEach(item => {
        if (item.type === 'video') {
          mediaSequence.push({
            type: 'video',
            sourceIndex: videoSourceIndex,
            duration: videoDurations[videoSourceIndex],
            id: item.id
          })
          videoSourceIndex++
        } else if (item.type === 'img') {
          mediaSequence.push({
            type: 'image',
            sourceIndex: imageSourceIndex,
            duration: imageDurations[imageSourceIndex],
            id: item.id
          })
          imageSourceIndex++
        }
      })
      
      console.log('📋 Media sequence from playlist:', mediaSequence.map(item => `${item.type}(${item.id})`).join(' → '))
      
      // Calculate sequential delays dynamically
      let currentDelay = 0
      
      console.log('🎬 Creating clips and layers...')
      this.updateLoadingStatus('Creating clips and layers...')
      
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
          imageIndex++
        }
        
        currentDelay += mediaItem.duration
      }
      
      // Create audio clips dynamically using config with looping
      const audioClips = []
      const audioVolume = mediaConfig.config.backgroundMusicVolume
      const audioLoopEnabled = mediaConfig.config.audioLoopEnabled
      
      if (audioLoopEnabled && loadedAudioSources.length > 0) {
        // Calculate total audio cycle duration
        const audioDurations = mediaConfig.tracks.map(track => track.duration)
        const totalAudioCycleDuration = audioDurations.reduce((sum, duration) => sum + duration, 0)
        
        console.log(`🎵 Audio cycle duration: ${totalAudioCycleDuration}s`)
        console.log(`🎬 Total composition duration: ${this.duration}s`)
        
        // Calculate how many complete cycles we need
        const cyclesNeeded = Math.ceil(this.duration / totalAudioCycleDuration)
        console.log(`🔄 Audio cycles needed: ${cyclesNeeded}`)
        
        // Create audio clips for all cycles
        let audioDelay = 0
        let clipsCreated = 0
        
        outerLoop: for (let cycle = 0; cycle < cyclesNeeded; cycle++) {
          for (let trackIndex = 0; trackIndex < loadedAudioSources.length; trackIndex++) {
            // Stop creating clips if we've exceeded the total composition duration
            if (audioDelay >= this.duration) {
              console.log(`🛑 Stopping audio loop: reached composition duration (${audioDelay}s >= ${this.duration}s)`)
              break outerLoop
            }
            
            const source = loadedAudioSources[trackIndex]
            const trackDuration = audioDurations[trackIndex]
            const delayFrames = audioDelay * fps
            
            const clip = new core.AudioClip(source, {
              volume: audioVolume,
              delay: delayFrames + 'f'
            })
            
            // Store original volume for later muting if needed
            clip._originalVolume = audioVolume
            
            audioClips.push(clip)
            clipsCreated++
            audioDelay += trackDuration
            
            // Safety check - prevent infinite loops
            if (clipsCreated > 100) {
              console.log(`🛑 Safety stop: created ${clipsCreated} audio clips`)
              break outerLoop
            }
          }
        }
        
        console.log(`✅ Created ${clipsCreated} total audio clips for looping`)
        
        
      } else {
        // Original non-looping behavior
        let audioDelay = 0
        for (let i = 0; i < loadedAudioSources.length; i++) {
          const source = loadedAudioSources[i]
          const delayFrames = audioDelay * fps
          
          const clip = new core.AudioClip(source, {
            volume: audioVolume,
            delay: i === 0 ? 0 : delayFrames + 'f'
          })
          
          // Store original volume for later muting if needed
          clip._originalVolume = audioVolume
          
          audioClips.push(clip)
          
          if (i === 0) {
            audioDelay = source.duration?.seconds ?? 180
          } else {
            const nextDelay = audioDelay + (source.duration?.seconds ?? 180)
            audioDelay = nextDelay
          }
        }
      }

      // Create audio layer and add all audio clips
      const audioLayer = this.composition.createLayer()
      
      // Set layer ordering for all dynamic layers
      for (let i = 0; i < videoLayers.length; i++) {
        videoLayers[i].index(i)
      }
      for (let i = 0; i < imageLayers.length; i++) {
        imageLayers[i].index(videoLayers.length + i)
      }
      audioLayer.index(videoLayers.length + imageLayers.length)

      // Add all clips to their respective layers
      for (let i = 0; i < videoClips.length; i++) {
        await videoLayers[i].add(videoClips[i])
      }
      
      for (let i = 0; i < imageClips.length; i++) {
        await imageLayers[i].add(imageClips[i])
      }
      
      for (let i = 0; i < audioClips.length; i++) {
        await audioLayer.add(audioClips[i])
      }
      
      console.log(`✅ Composition assembled: ${videoClips.length} videos, ${imageClips.length} images, ${audioClips.length} audio tracks`)
      
      // Mount composition to player (like working example)
      this.updateLoadingStatus('Mounting composition to player...')
      const player = document.getElementById('player')
      this.composition.mount(player)
      console.log('🖥️ Composition mounted to player')
      
      // Setup composition event listeners
      this.updateLoadingStatus('Setting up player controls...')
      this.setupCompositionEvents()
      
      // Update UI with new duration
      this.updateTimeDisplay()
      this.updateTimeline()
      
      console.log(`🎉 JSON-configured composition ready: ${this.duration}s total duration`)
      console.log(`🔊 Audio state: ${this.isMuted ? 'MUTED' : 'UNMUTED'} ${this.isMobile ? '(Mobile detected - muted by default)' : ''}`)
      
      // Apply initial mute state after composition is ready
      if (this.isMuted) {
        console.log('🔇 Applying initial mute state...')
        await this.applyMuteState()
      }
      
      // Hide loading overlay - composition is ready!
      this.hideLoadingOverlay()
      
    } catch (error) {
      console.error('❌ Error initializing composition:', error)
      console.error('Error details:', error.stack)
      this.updateLoadingStatus('Error loading composition')
      // Hide overlay on error too
      setTimeout(() => this.hideLoadingOverlay(), 2000)
    }
  }

  setupCompositionEvents() {
    // Listen to composition events (like working example)
    this.composition.on('play', () => {
      console.log('▶️ Playback started')
      this.isPlaying = true
      this.updatePlayPauseButtons()
    })
    
    this.composition.on('pause', () => {
      console.log('⏸️ Playback paused')
      this.isPlaying = false
      this.updatePlayPauseButtons()
    })
    
    this.composition.on('currentframe', (evt) => {
      // Update current time from composition
      const frame = evt.detail
      const totalFrames = this.composition.duration.frames
      this.currentTime = frame / totalFrames * this.duration
      
      this.updateTimeDisplay()
      this.updateTimeline()
    })
  }

  setupControls() {
    const playBtn = document.querySelector('[data-lucide="play"]')
    const pauseBtn = document.querySelector('[data-lucide="pause"]')
    const skipBackBtn = document.querySelector('[data-lucide="skip-back"]')
    const skipForwardBtn = document.querySelector('[data-lucide="skip-forward"]')
    const muteBtn = document.getElementById('mute-btn')
    const unmuteBtn = document.getElementById('unmute-btn')
    const exportBtn = document.getElementById('export')

    playBtn.addEventListener('click', () => this.play())
    pauseBtn.addEventListener('click', () => this.pause())
    skipBackBtn.addEventListener('click', () => this.skipBack())
    skipForwardBtn.addEventListener('click', () => this.skipForward())
    muteBtn.addEventListener('click', () => this.mute())
    unmuteBtn.addEventListener('click', () => this.unmute())
    exportBtn.addEventListener('click', () => this.export())
    
    // Set initial mute button state
    this.updateMuteButtons()
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

  mute() {
    if (!this.isMuted) {
      this.isMuted = true
      this.applyMuteState()
      this.updateMuteButtons()
      console.log('🔇 Audio muted')
    }
  }

  unmute() {
    if (this.isMuted) {
      this.isMuted = false
      this.applyMuteState()
      this.updateMuteButtons()
      console.log('🔊 Audio unmuted')
    }
  }

  updateMuteButtons() {
    const muteBtn = document.getElementById('mute-btn')
    const unmuteBtn = document.getElementById('unmute-btn')
    
    if (this.isMuted) {
      muteBtn.style.display = 'none'
      unmuteBtn.style.display = 'block'
    } else {
      unmuteBtn.style.display = 'none'
      muteBtn.style.display = 'block'
    }
  }

  async applyMuteState() {
    if (!this.composition) return
    
    try {
      // Try composition-level muting first
      if (this.composition.muted !== undefined) {
        this.composition.muted = this.isMuted
        console.log(`🎵 Composition muted property set to: ${this.isMuted}`)
        return
      }
      
      // Try player-level muting
      const player = document.getElementById('player')
      if (player) {
        // Look for video elements within the player
        const videoElements = player.querySelectorAll('video')
        videoElements.forEach(video => {
          video.muted = this.isMuted
          console.log(`🎥 Video element muted: ${this.isMuted}`)
        })
        
        // Look for audio elements within the player
        const audioElements = player.querySelectorAll('audio')
        audioElements.forEach(audio => {
          if (this.isMuted) {
            audio._originalVolume = audio.volume
            audio.volume = 0
          } else {
            audio.volume = audio._originalVolume || 1
          }
          console.log(`🎵 Audio element volume set to: ${audio.volume}`)
        })
      }
      
      // Try setting volume on the composition if available
      if (this.composition.volume !== undefined) {
        if (this.isMuted) {
          this.composition._originalVolume = this.composition.volume
          this.composition.volume = 0
        } else {
          this.composition.volume = this.composition._originalVolume || 1
        }
        console.log(`🔊 Composition volume set to: ${this.composition.volume}`)
      }
      
      // As a fallback, try to access the underlying media elements through the composition
      if (this.composition.canvas) {
        const canvas = this.composition.canvas
        const context = canvas.getContext('2d')
        // Try to find associated media elements
        if (context && context.drawImage) {
          // This is a more complex approach - might need to access internal composition state
          console.log('🎬 Trying to access internal composition media elements...')
        }
      }
      
      console.log(`🔧 Applied mute state: ${this.isMuted}`)
      
    } catch (error) {
      console.error('❌ Error applying mute state:', error)
    }
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
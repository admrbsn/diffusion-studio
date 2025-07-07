import * as core from '@diffusionstudio/core'

// Simple video creation example
async function createSimpleVideo() {
  console.log('Creating a simple video...')

  // Create a 5-second video composition
  const composition = new core.Composition({
    width: 1280,
    height: 720,
    fps: 30,
    duration: 5
  })

  // Add a simple text clip
  const text = new core.TextClip({
    text: 'Hello, Diffusion Studio!',
    fontSize: 48,
    fill: { color: '#ffffff' },
    position: 'center',
    duration: 5
  })

  // Add a colored background
  const background = new core.RectangleClip({
    width: 1280,
    height: 720,
    fill: { color: '#4338ca' },
    duration: 5
  })

  // Add clips to composition
  await composition.add(background)
  await composition.add(text)

  // Render the video
  console.log('Rendering video...')
  await new core.Encoder(composition).render('simple-video.mp4')
  
  console.log('✅ Video created: simple-video.mp4')
}

// Run the example
createSimpleVideo().catch(console.error) 
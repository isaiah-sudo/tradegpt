# Luxury Win Videos Directory

Drop your photorealistic 4K or 1080p MP4 / WebM wealth-flex videos here!

Supported default filenames:
- `supercar_drift.mp4` - Hypercar / Bugatti drift video
- `mega_yacht.mp4`    - Monaco 300ft Superyacht cruise video
- `private_jet.mp4`   - Gulfstream G700 Stratosphere jet flight video

Alternatively, any custom URL (including online CDNs or blobs) can be dynamically registered in JavaScript:
```javascript
window.winAnimations.registerVideo('supercar_drift', 'https://example.com/bugatti_drift.mp4');
```

When a video file is present, the engine automatically plays the video with full-screen cinematic presentation, widescreen bars, and luxury HUD overlays. If no video file is present or if video loading fails, the engine seamlessly falls back to the ultra-realistic 60fps procedural HTML5 canvas simulation.

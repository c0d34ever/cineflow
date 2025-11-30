import React, { useState, useRef, useEffect } from 'react';
import { Scene } from '../types';
import { mediaService } from '../apiServices';
import { getImageUrl } from '../utils/imageUtils';

interface VideoSlideshowExportProps {
  scenes: Scene[];
  projectId: string;
  onClose: () => void;
}

interface MediaItem {
  id: string;
  file_path: string;
  thumbnail_path?: string;
  imagekit_url?: string | null;
  imagekit_thumbnail_url?: string | null;
  alt_text?: string;
  is_primary: boolean;
}

const VideoSlideshowExport: React.FC<VideoSlideshowExportProps> = ({ scenes, projectId, onClose }) => {
  const [sceneImages, setSceneImages] = useState<Record<string, MediaItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'gif' | 'mp4'>('gif');
  const [durationPerScene, setDurationPerScene] = useState(3); // seconds
  const [transitionDuration, setTransitionDuration] = useState(0.5); // seconds
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadAllSceneImages();
  }, [scenes]);

  const loadAllSceneImages = async () => {
    setLoading(true);
    try {
      const imagesMap: Record<string, MediaItem[]> = {};
      await Promise.all(
        scenes.map(async (scene) => {
          try {
            const media = await mediaService.getSceneMedia(scene.id);
            const validMedia = Array.isArray(media) ? media.filter(item => item && item.id) : [];
            imagesMap[scene.id] = validMedia;
          } catch (error) {
            imagesMap[scene.id] = [];
          }
        })
      );
      setSceneImages(imagesMap);
    } catch (error) {
      console.error('Failed to load scene images:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const drawImageOnCanvas = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number) => {
    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;

    let drawWidth = width;
    let drawHeight = height;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > canvasAspect) {
      // Image is wider
      drawHeight = width / imgAspect;
      offsetY = (height - drawHeight) / 2;
    } else {
      // Image is taller
      drawWidth = height * imgAspect;
      offsetX = (width - drawWidth) / 2;
    }

    // Fill background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw image centered
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  const exportAsGIF = async () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    setExporting(true);
    setProgress(0);
    setStatus('Loading images...');

    try {
      // Load all images first
      const imageData: Array<{ scene: Scene; image: HTMLImageElement }> = [];
      
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const media = sceneImages[scene.id] || [];
        const primaryImage = media.find(img => img.is_primary) || media[0];
        
        if (primaryImage) {
          const imageUrl = getImageUrl(primaryImage, false); // Use full image, not thumbnail
          try {
            const img = await loadImage(imageUrl);
            imageData.push({ scene, image: img });
            setProgress((i + 1) / scenes.length * 30);
          } catch (error) {
            console.warn(`Failed to load image for scene ${scene.id}:`, error);
          }
        }
      }

      if (imageData.length === 0) {
        alert('No images found to export. Please add images to your scenes first.');
        setExporting(false);
        return;
      }

      setStatus('Generating GIF frames...');
      
      // Use a simple approach: create frames and use a library or canvas-based approach
      // For now, we'll create a simple animated approach using canvas
      // Note: Full GIF encoding would require a library like gif.js
      
      // Create frames as data URLs
      const frames: string[] = [];
      const frameDuration = durationPerScene * 10; // 10 frames per second
      const transitionFrames = transitionDuration * 10;

      for (let i = 0; i < imageData.length; i++) {
        const { image } = imageData[i];
        
        // Draw main frame
        drawImageOnCanvas(ctx, image, width, height);
        const frameData = canvas.toDataURL('image/png');
        
        // Add multiple copies for duration
        for (let f = 0; f < frameDuration; f++) {
          frames.push(frameData);
        }

        // Transition to next image (if not last)
        if (i < imageData.length - 1) {
          const nextImage = imageData[i + 1].image;
          for (let t = 0; t < transitionFrames; t++) {
            const alpha = t / transitionFrames;
            // Draw current image
            drawImageOnCanvas(ctx, image, width, height);
            // Overlay next image with increasing opacity
            ctx.globalAlpha = alpha;
            drawImageOnCanvas(ctx, nextImage, width, height);
            ctx.globalAlpha = 1.0;
            frames.push(canvas.toDataURL('image/png'));
          }
        }

        setProgress(30 + (i / imageData.length) * 50);
      }

      setStatus('Encoding GIF...');
      setProgress(80);
      
      // Create animated GIF using canvas frames
      // We'll create a simple animated GIF by encoding frames
      const gifBlob = await createAnimatedGIF(frames, width, height, durationPerScene);
      
      if (gifBlob) {
        // Download the GIF
        const url = URL.createObjectURL(gifBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cineflow-slideshow-${Date.now()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setProgress(100);
        setStatus('GIF exported successfully!');
        setTimeout(() => {
          setExporting(false);
          setStatus('');
        }, 2000);
      } else {
        throw new Error('Failed to create GIF');
      }
      
    } catch (error) {
      console.error('GIF export error:', error);
      alert('Failed to export GIF. Please try MP4 format instead.');
      setExporting(false);
      setStatus('');
    }
  };

  // Create animated GIF from frames using a practical browser-based approach
  const createAnimatedGIF = async (
    frames: string[], 
    width: number, 
    height: number, 
    frameDelay: number
  ): Promise<Blob | null> => {
    try {
      // Use gif.js library loaded from CDN for GIF encoding
      // This is the most reliable browser-based approach
      return await encodeGIFWithLibrary(frames, width, height, Math.round(frameDelay * 100)); // Convert to milliseconds
    } catch (error) {
      console.error('Error creating GIF:', error);
      // Fallback: Create an animated WebP or suggest video conversion
      return null;
    }
  };

  // Encode GIF using gif.js library (loaded dynamically)
  const encodeGIFWithLibrary = async (
    frames: string[], 
    width: number, 
    height: number, 
    delay: number
  ): Promise<Blob> => {
    // Load gif.js from CDN if not already loaded
    if (!(window as any).GIF) {
      await loadScript('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js');
      await loadScript('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js');
    }

    const GIF = (window as any).GIF;
    if (!GIF) {
      throw new Error('GIF library failed to load');
    }

    // Create GIF instance
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: width,
      height: height,
      workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
    });

    // Convert frames to ImageData and add to GIF
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('Could not get canvas context');

    for (const frameDataUrl of frames) {
      const img = await loadImage(frameDataUrl);
      tempCtx.clearRect(0, 0, width, height);
      drawImageOnCanvas(tempCtx, img, width, height);
      const imageData = tempCtx.getImageData(0, 0, width, height);
      gif.addFrame(imageData, { delay: delay });
    }

    // Render GIF
    return new Promise((resolve, reject) => {
      gif.on('finished', (blob: Blob) => {
        resolve(blob);
      });
      gif.on('error', (error: Error) => {
        reject(error);
      });
      gif.render();
    });
  };

  // Load script dynamically
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  };

  const exportAsMP4 = async () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    setExporting(true);
    setProgress(0);
    setStatus('Loading images...');

    try {
      // Check if MediaRecorder is available
      if (typeof MediaRecorder === 'undefined') {
        alert('Video recording is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.');
        setExporting(false);
        return;
      }

      // Try to find a supported MIME type
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];

      let selectedMimeType = 'video/webm';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      // Load all images first
      const imageData: Array<{ scene: Scene; image: HTMLImageElement }> = [];
      
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const media = sceneImages[scene.id] || [];
        const primaryImage = media.find(img => img.is_primary) || media[0];
        
        if (primaryImage) {
          const imageUrl = getImageUrl(primaryImage, false);
          try {
            const img = await loadImage(imageUrl);
            imageData.push({ scene, image: img });
            setProgress((i + 1) / scenes.length * 20);
          } catch (error) {
            console.warn(`Failed to load image for scene ${scene.id}:`, error);
          }
        }
      }

      if (imageData.length === 0) {
        alert('No images found to export. Please add images to your scenes first.');
        setExporting(false);
        return;
      }

      setStatus('Recording video...');

      // Create a stream from canvas
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const fileExtension = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: selectedMimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `storyboard_slideshow_${projectId}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExporting(false);
        setStatus('Export complete!');
        setTimeout(() => setStatus(''), 3000);
      };

      mediaRecorder.start();

      // Animate through scenes
      const fps = 30;
      const sceneFrameCount = durationPerScene * fps;
      const transitionFrameCount = transitionDuration * fps;

      for (let i = 0; i < imageData.length; i++) {
        const { image } = imageData[i];
        
        // Draw scene for duration
        for (let frame = 0; frame < sceneFrameCount; frame++) {
          drawImageOnCanvas(ctx, image, width, height);
          await new Promise(resolve => setTimeout(resolve, 1000 / fps));
          setProgress(20 + ((i * sceneFrameCount + frame) / (imageData.length * sceneFrameCount)) * 70);
        }

        // Transition to next (if not last)
        if (i < imageData.length - 1) {
          const nextImage = imageData[i + 1].image;
          for (let frame = 0; frame < transitionFrameCount; frame++) {
            const alpha = frame / transitionFrameCount;
            drawImageOnCanvas(ctx, image, width, height);
            ctx.globalAlpha = alpha;
            drawImageOnCanvas(ctx, nextImage, width, height);
            ctx.globalAlpha = 1.0;
            await new Promise(resolve => setTimeout(resolve, 1000 / fps));
          }
        }
      }

      mediaRecorder.stop();
      
    } catch (error) {
      console.error('MP4 export error:', error);
      alert('Failed to export video. Please check browser compatibility.');
      setExporting(false);
    }
  };

  const handleExport = async () => {
    if (exportFormat === 'gif') {
      await exportAsGIF();
    } else {
      await exportAsMP4();
    }
  };

  const scenesWithImages = scenes.filter(scene => {
    const media = sceneImages[scene.id] || [];
    return media.length > 0;
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Video Slideshow Export</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Generate MP4 or GIF from scene images</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded"
            disabled={exporting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
              <p className="text-zinc-400">Loading scene images...</p>
            </div>
          ) : scenesWithImages.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-lg text-zinc-400 mb-2">No images found</p>
              <p className="text-sm text-zinc-500">Please add images to your scenes before exporting</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Export Format */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-sm font-bold text-white mb-3">Export Format</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="mp4"
                      checked={exportFormat === 'mp4'}
                      onChange={(e) => setExportFormat(e.target.value as 'mp4')}
                      className="text-amber-500"
                      disabled={exporting}
                    />
                    <span className="text-zinc-300">WebM/MP4 (Video)</span>
                    <span className="text-xs text-zinc-500">(Recommended)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="gif"
                      checked={exportFormat === 'gif'}
                      onChange={(e) => setExportFormat(e.target.value as 'gif')}
                      className="text-amber-500"
                      disabled={exporting}
                    />
                    <span className="text-zinc-300">GIF (Animated)</span>
                  </label>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Video export uses WebM format (compatible with most players). GIF export creates animated GIFs from scene images.
                </p>
              </div>

              {/* Settings */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold text-white mb-3">Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Duration per Scene (seconds)</label>
                    <input
                      type="number"
                      value={durationPerScene}
                      onChange={(e) => setDurationPerScene(parseFloat(e.target.value) || 3)}
                      min="0.5"
                      max="10"
                      step="0.5"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      disabled={exporting}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Transition Duration (seconds)</label>
                    <input
                      type="number"
                      value={transitionDuration}
                      onChange={(e) => setTransitionDuration(parseFloat(e.target.value) || 0.5)}
                      min="0"
                      max="2"
                      step="0.1"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      disabled={exporting}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Width (pixels)</label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(parseInt(e.target.value) || 1920)}
                      min="480"
                      max="3840"
                      step="240"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      disabled={exporting}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Height (pixels)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(parseInt(e.target.value) || 1080)}
                      min="270"
                      max="2160"
                      step="135"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      disabled={exporting}
                    />
                  </div>
                </div>
              </div>

              {/* Preview Info */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-sm font-bold text-white mb-3">Preview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-zinc-400">Scenes with Images</div>
                    <div className="text-white font-bold">{scenesWithImages.length} / {scenes.length}</div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Total Duration</div>
                    <div className="text-white font-bold">
                      {((scenesWithImages.length * durationPerScene) + ((scenesWithImages.length - 1) * transitionDuration)).toFixed(1)}s
                    </div>
                  </div>
                </div>
              </div>

              {/* Hidden canvas for rendering */}
              <canvas ref={canvasRef} className="hidden" />
              <video ref={videoRef} className="hidden" />

              {/* Export Progress */}
              {exporting && (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{status}</span>
                    <span className="text-sm text-zinc-400">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || loading || scenesWithImages.length === 0}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Exporting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                  <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                </svg>
                Export {exportFormat.toUpperCase()}
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={exporting}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoSlideshowExport;


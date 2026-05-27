
import React, { useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, Zap, Plus, Layers, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface ScannerProps {
  onScan: (base64Image: string, isManual?: boolean) => void;
  onGradingScan: (images: string[]) => void;
  isProcessing: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, onGradingScan, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gradingMode, setGradingMode] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);

  const startCamera = useCallback(async () => {
    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
      } catch (e) {
        console.warn("Environment camera failed, falling back to default video source.", e);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access any camera. Please check permissions or hardware connection.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const captureImage = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      
      if (gradingMode) {
        const newImages = [...capturedImages, base64];
        setCapturedImages(newImages);
        if (newImages.length === 3) {
          onGradingScan(newImages);
          setCapturedImages([]);
          setGradingMode(false);
        }
      } else {
        onScan(base64, false);
      }
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        onScan(base64, true);
      };
      reader.readAsDataURL(file);
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const gradingLabels = ["Front View", "Back View", "Angle View (Crease Check)"];

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[3/4] bg-slate-900 rounded-[2.5rem] overflow-hidden border-4 border-red-900/40 shadow-2xl">
      {/* Hidden file input always available */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleManualUpload} 
      />

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/80 backdrop-blur-md">
          <AlertTriangle className="text-red-500 mb-4" size={48} />
          <p className="text-white font-bold mb-6">{error}</p>
          <div className="flex flex-col gap-3 w-full max-w-[200px]">
            <button 
              onClick={startCamera}
              className="px-6 py-3 bg-red-900 hover:bg-red-800 text-white rounded-xl flex items-center justify-center gap-2 transition-all font-black uppercase tracking-widest text-xs"
            >
              <RefreshCw size={18} /> Re-summon
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl flex items-center justify-center gap-2 transition-all font-black uppercase tracking-widest text-xs"
            >
              <Plus size={18} /> Manual Upload
            </button>
          </div>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover grayscale brightness-90"
          />
          
          <div className="absolute inset-0 pointer-events-none border-[30px] border-black/60">
            <div className={`w-full h-full border-2 ${gradingMode ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'border-white/20'} rounded-2xl flex items-center justify-center transition-all duration-500`}>
                <div className={`w-full h-0.5 ${gradingMode ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-white/40'} animate-[bounce_3s_infinite] absolute top-1/2 -translate-y-1/2 left-0 right-0 blur-[1px]`}></div>
            </div>
          </div>

          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-between px-8 z-20">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-full bg-black/60 border border-white/10 text-white hover:bg-white/10 transition-all backdrop-blur-md shadow-xl"
              title="Manual Artifact Upload"
            >
              <Plus size={24} />
            </button>

            <button
              onClick={captureImage}
              disabled={isProcessing}
              className={`group flex items-center justify-center w-20 h-20 rounded-full ${gradingMode ? 'bg-red-600 shadow-[0_0_25px_rgba(220,38,38,0.6)]' : 'bg-white'} text-black shadow-2xl transition-all active:scale-90 ${isProcessing ? 'opacity-50' : 'hover:scale-110'}`}
            >
              {isProcessing ? (
                <RefreshCw className="animate-spin" size={32} />
              ) : (
                <Zap fill="currentColor" size={32} />
              )}
            </button>

            <button
              onClick={() => {
                setGradingMode(!gradingMode);
                setCapturedImages([]);
              }}
              className={`p-4 rounded-full transition-all backdrop-blur-md shadow-xl border ${gradingMode ? 'bg-red-900 border-red-500 text-white' : 'bg-black/60 border-white/10 text-white hover:bg-white/10'}`}
              title="Premium Grading Mode"
            >
              <Layers size={24} />
            </button>
          </div>

          <div className="absolute top-6 left-0 right-0 flex flex-col items-center gap-2 px-6">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] backdrop-blur-xl border ${gradingMode ? 'bg-red-950/80 border-red-500 text-red-100 shadow-[0_0_15px_rgba(153,27,27,0.4)]' : 'bg-black/60 border-white/20 text-white'}`}>
              {gradingMode ? 'PREMIUM GRADING RITUAL' : 'ARTIFACT SCANNER ACTIVE'}
            </span>
            {gradingMode && (
              <div className="flex flex-col items-center gap-1">
                <p className="text-[9px] font-black text-white/60 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full">
                  Step {capturedImages.length + 1}: {gradingLabels[capturedImages.length]}
                </p>
                <div className="flex gap-1.5 mt-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`w-8 h-1.5 rounded-full transition-all ${i < capturedImages.length ? 'bg-red-500' : 'bg-white/20'}`}></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Scanner;

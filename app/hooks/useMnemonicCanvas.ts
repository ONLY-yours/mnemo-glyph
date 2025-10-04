import { useEffect } from 'react';
import { mnemonicToEpicycles } from '../utils/mnemonicToEpicycles';
import { calculatePosition } from '../utils/fourierTransform';

export function useMnemonicCanvas(
  mnemonic: string | null,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  useEffect(() => {
    if (!mnemonic || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Convert mnemonic to epicycles using new algorithm
    const epicycles = mnemonicToEpicycles(mnemonic);

    // Clear canvas
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Set drawing style
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Calculate center
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate scale (based on max amplitude)
    const maxAmplitude = Math.max(...epicycles.map(e => Math.abs(e.amplitude)));
    const scale = Math.min(width, height) * 0.35 / (maxAmplitude || 1);

    // Draw the Fourier path
    const numPoints = 2000;
    ctx.beginPath();

    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * 2 * Math.PI;
      const pos = calculatePosition(epicycles, t);

      const scaledX = centerX + pos.x * scale;
      const scaledY = centerY + pos.y * scale;

      if (i === 0) {
        ctx.moveTo(scaledX, scaledY);
      } else {
        ctx.lineTo(scaledX, scaledY);
      }
    }

    ctx.closePath();
    ctx.stroke();

    // Mark start point (t=0)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();

    const startPos = calculatePosition(epicycles, 0);
    ctx.arc(
      centerX + startPos.x * scale,
      centerY + startPos.y * scale,
      8,
      0,
      2 * Math.PI
    );
    ctx.fill();

  }, [mnemonic, canvasRef]);
}

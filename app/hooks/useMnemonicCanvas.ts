import { useEffect } from 'react';
import { wordlists } from 'bip39';
import fft from 'fft-js';

export function useMnemonicCanvas(
  mnemonic: string | null,
  canvasRef: React.RefObject<HTMLCanvasElement>
) {
  useEffect(() => {
    if (!mnemonic || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Build word to index map
    const wordList = wordlists.english;
    const wordToIndex = new Map<string, number>();
    wordList.forEach((word, index) => {
      wordToIndex.set(word, index);
    });

    // Convert mnemonic to indices
    const words = mnemonic.split(' ');
    const indices = words.map(word => wordToIndex.get(word) ?? 0);

    // Perform FFT
    const fftSize = Math.pow(2, Math.ceil(Math.log2(indices.length)));
    const paddedIndices = [...indices];
    while (paddedIndices.length < fftSize) {
      paddedIndices.push(0);
    }

    const fftCoeffs = fft.fft(paddedIndices);

    // Clear canvas
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Set drawing style
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Calculate center and scale
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 4;

    // Draw the Fourier path
    const numPoints = 1000;
    ctx.beginPath();

    for (let i = 0; i < numPoints; i++) {
      const time = (i / numPoints) * 2 * Math.PI;
      let x = 0;
      let y = 0;

      // Iterate over all Fourier coefficients
      fftCoeffs.forEach((coeff, k) => {
        const amplitude = (Math.sqrt(coeff[0] ** 2 + coeff[1] ** 2) / indices.length) * scale;
        const phase = Math.atan2(coeff[1], coeff[0]);
        const frequency = k > indices.length / 2 ? k - indices.length : k;

        // Add contribution from each epicycle
        x += amplitude * Math.cos(frequency * time + phase);
        y += amplitude * Math.sin(frequency * time + phase);
      });

      if (i === 0) {
        ctx.moveTo(centerX + x, centerY + y);
      } else {
        ctx.lineTo(centerX + x, centerY + y);
      }
    }

    ctx.closePath();
    ctx.stroke();

    // Mark start point
    ctx.fillStyle = '#10b981';
    ctx.beginPath();

    let startX = 0;
    let startY = 0;
    fftCoeffs.forEach((coeff, k) => {
      const amplitude = (Math.sqrt(coeff[0] ** 2 + coeff[1] ** 2) / indices.length) * scale;
      const phase = Math.atan2(coeff[1], coeff[0]);
      const frequency = k > indices.length / 2 ? k - indices.length : k;
      startX += amplitude * Math.cos(phase);
      startY += amplitude * Math.sin(phase);
    });

    ctx.arc(centerX + startX, centerY + startY, 6, 0, 2 * Math.PI);
    ctx.fill();

  }, [mnemonic, canvasRef]);
}

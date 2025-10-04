import { useEffect } from 'react';
import { wordlists } from 'bip39';

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

    // Map each word index to [amplitude, phase]
    // 2048 words = 32 rows × 64 columns
    // row (0-31) → phase (0 to 2π)
    // column (0-63) → amplitude (normalized)
    const ROWS = 32;
    const COLS = 64;

    const epicycles = indices.map(index => {
      const row = Math.floor(index / COLS);  // 0-31
      const col = index % COLS;              // 0-63

      const phase = (row / ROWS) * 2 * Math.PI;  // 相位: 0 到 2π (32 个离散角度)
      // 振幅映射到 0.1 到 1.0，避免零振幅
      const amplitude = 0.1 + (col / COLS) * 0.9;  // 振幅: 0.1 到 1.0

      return { amplitude, phase };
    });

    // Clear canvas
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Set drawing style
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Calculate center and safe drawing area
    const centerX = width / 2;
    const centerY = height / 2;

    // 计算理论最大半径（12个圆最坏情况同向叠加）
    const maxTheoreticalRadius = epicycles.reduce((sum, e) => sum + e.amplitude, 0);

    // 安全缩放：确保图形不超出Canvas的80%区域
    const safeArea = Math.min(width, height) * 0.4;  // 使用40%作为安全半径
    const baseScale = safeArea / maxTheoreticalRadius;

    // Draw the epicycles path (周转圆轨迹)
    const numPoints = 2000;
    ctx.beginPath();

    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * 2 * Math.PI;
      let x = 0;
      let y = 0;

      // Sum all epicycles (周转圆叠加)
      epicycles.forEach((epicycle, k) => {
        const { amplitude, phase } = epicycle;

        // 每个周转圆以不同的频率旋转
        // 频率 = k (第 k 个单词对应第 k 个频率)
        const frequency = k;
        const angle = frequency * t + phase;

        // 叠加每个圆的贡献
        const radius = amplitude * baseScale;
        x += radius * Math.cos(angle);
        y += radius * Math.sin(angle);
      });

      if (i === 0) {
        ctx.moveTo(centerX + x, centerY + y);
      } else {
        ctx.lineTo(centerX + x, centerY + y);
      }
    }

    ctx.closePath();
    ctx.stroke();

    // Mark start point (t=0)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();

    let startX = 0;
    let startY = 0;

    epicycles.forEach(({ amplitude, phase }) => {
      const radius = amplitude * baseScale;
      startX += radius * Math.cos(phase);
      startY += radius * Math.sin(phase);
    });

    ctx.arc(centerX + startX, centerY + startY, 8, 0, 2 * Math.PI);
    ctx.fill();

  }, [mnemonic, canvasRef]);
}

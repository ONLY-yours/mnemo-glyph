'use client';

import { useRef, useState } from 'react';
import { generateMnemonic } from 'bip39';
import { useMnemonicCanvas } from '../hooks/useMnemonicCanvas';

export default function MnemonicVisualizer() {
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useMnemonicCanvas(mnemonic, canvasRef);

  const handleGenerateMnemonic = () => {
    const newMnemonic = generateMnemonic(); // 128 bits = 12 words
    setMnemonic(newMnemonic);
  };

  const handleSaveImage = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `mnemonic-visual-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">助记词傅立叶视觉化生成器</h1>
          <p className="text-slate-300">Mnemonic Fourier Visualizer</p>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            将 BIP39 助记词转化为独一无二的几何图形，提供一种新颖的视觉记忆方式
          </p>
        </div>

        {/* Canvas */}
        <div className="bg-white rounded-lg shadow-2xl p-4">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-auto border border-slate-200 rounded"
          />
        </div>

        {/* Mnemonic Display */}
        {mnemonic && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-3">您的助记词 (请妥善保管)</h2>
            <div className="bg-slate-900 rounded p-4 font-mono text-sm text-slate-200 break-all">
              {mnemonic}
            </div>
            <p className="text-xs text-yellow-400 mt-3">
              ⚠️ 请将助记词安全备份，切勿在线存储或分享给他人
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleGenerateMnemonic}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
          >
            生成新助记词
          </button>
          <button
            onClick={handleSaveImage}
            disabled={!mnemonic}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors shadow-lg disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            保存为 PNG
          </button>
        </div>

        {/* Info */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-white mb-2">工作原理</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            本工具通过傅立叶变换将助记词索引序列转换为频率分量，每个分量对应一个旋转的圆（周转圆）。
            所有周转圆的叠加轨迹形成一个独特的、连续的封闭曲线，作为该助记词的"视觉指纹"。
            绿色圆点标记图形的起始位置。
          </p>
        </div>
      </div>
    </div>
  );
}

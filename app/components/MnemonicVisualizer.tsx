'use client';

import { useRef, useState } from 'react';
import { generateMnemonic } from 'bip39';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
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

        {/* Canvas with Zoom/Pan */}
        <div className="bg-white rounded-lg shadow-2xl p-4">
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            doubleClick={{ mode: 'zoomIn', step: 0.5 }}
            wheel={{ step: 0.1 }}
            panning={{ disabled: false }}
            pinch={{ disabled: false }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Zoom Controls */}
                <div className="flex gap-2 mb-3 justify-end">
                  <button
                    onClick={() => zoomIn()}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-medium transition-colors"
                    title="放大"
                  >
                    +
                  </button>
                  <button
                    onClick={() => zoomOut()}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-medium transition-colors"
                    title="缩小"
                  >
                    −
                  </button>
                  <button
                    onClick={() => resetTransform()}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-medium transition-colors"
                    title="重置视图"
                  >
                    ⟲
                  </button>
                </div>

                {/* Transformable Canvas */}
                <TransformComponent
                  wrapperStyle={{
                    width: '100%',
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                  contentStyle={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    width={1600}
                    height={1200}
                    className="border border-slate-200 rounded"
                    style={{ width: '800px', height: '600px' }}
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
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
          <h3 className="text-sm font-semibold text-white mb-2">工作原理 & 使用提示</h3>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            本工具通过傅立叶变换将助记词索引序列转换为频率分量，每个分量对应一个旋转的圆（周转圆）。
            所有周转圆的叠加轨迹形成一个独特的、连续的封闭曲线，作为该助记词的"视觉指纹"。
            绿色圆点标记图形的起始位置。
          </p>
          <p className="text-xs text-slate-400">
            💡 <strong>交互提示：</strong>鼠标滚轮缩放 | 拖拽移动 | 双击放大 | 移动端双指缩放
          </p>
        </div>
      </div>
    </div>
  );
}

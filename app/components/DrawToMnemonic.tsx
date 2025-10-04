'use client';

import { useEffect, useRef, useState } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import { pointsToEpicycles } from '../utils/fourierTransform';
import { epicyclesToMnemonic } from '../utils/mnemonicToEpicycles';
import { useMnemonicCanvas } from '../hooks/useMnemonicCanvas';
import Link from 'next/link';
import type { Point } from '../utils/svgPathParser';

export default function DrawToMnemonic() {
  const sketchRef = useRef<ReactSketchCanvasRef>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ generation: 0, fitness: 0 });
  const [resultMnemonic, setResultMnemonic] = useState<string | null>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });
  const [svgPreviewUrl, setSvgPreviewUrl] = useState<string | null>(null);
  const [importedSvgMeta, setImportedSvgMeta] = useState<
    { name: string; pathCount: number; pointCount: number } | null
  >(null);

  useMnemonicCanvas(resultMnemonic, resultCanvasRef);

  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const { width, height } = entries[0].contentRect;
      if (!width || !height) return;
      setCanvasSize({ width, height });
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (svgPreviewUrl) {
        URL.revokeObjectURL(svgPreviewUrl);
      }
    };
  }, [svgPreviewUrl]);

  const normalizeSvgPaths = (paths: Point[][]): Point[][] => {
    const flatPoints = paths.flat();
    if (flatPoints.length === 0) return paths;

    const minX = Math.min(...flatPoints.map((point) => point.x));
    const minY = Math.min(...flatPoints.map((point) => point.y));
    const maxX = Math.max(...flatPoints.map((point) => point.x));
    const maxY = Math.max(...flatPoints.map((point) => point.y));

    const boundsWidth = maxX - minX || 1;
    const boundsHeight = maxY - minY || 1;

    const padding = 20;
    const effectiveWidth = Math.max(canvasSize.width - padding * 2, 1);
    const effectiveHeight = Math.max(canvasSize.height - padding * 2, 1);
    const scale = Math.min(effectiveWidth / boundsWidth, effectiveHeight / boundsHeight);

    const offsetX = (canvasSize.width - boundsWidth * scale) / 2;
    const offsetY = (canvasSize.height - boundsHeight * scale) / 2;

    return paths.map((path) =>
      path.map((point) => ({
        x: (point.x - minX) * scale + offsetX,
        y: (point.y - minY) * scale + offsetY,
      }))
    );
  };

  // 从绘图中提取点序列
  const extractPointsFromDrawing = async (): Promise<Point[]> => {
    if (!sketchRef.current) {
      console.warn('⚠️ [extractPoints] sketchRef 为空');
      return [];
    }

    console.log('📍 [extractPoints] 开始导出路径...');
    const paths = await sketchRef.current.exportPaths();
    console.log('📍 [extractPoints] 导出的原始数据:', paths);
    console.log('📍 [extractPoints] paths 类型:', typeof paths);
    console.log('📍 [extractPoints] paths 长度:', paths?.length);

    if (!paths || paths.length === 0) {
      console.warn('⚠️ [extractPoints] paths 为空或长度为0');
      return [];
    }

    // 采样路径点
    const points: Point[] = [];

    paths.forEach((path, pathIndex) => {
      console.log(`📍 [extractPoints] 处理第 ${pathIndex} 条路径:`, path);
      console.log(`📍 [extractPoints] path.paths 存在?`, !!path.paths);
      console.log(`📍 [extractPoints] path.paths 长度?`, path.paths?.length);

      if (path.paths && path.paths.length > 0) {
        path.paths.forEach((p, pointIndex) => {
          console.log(`📍 [extractPoints] 路径${pathIndex} 点${pointIndex}:`, p);
          if (p.x !== undefined && p.y !== undefined) {
            points.push({ x: p.x, y: p.y });
          }
        });
      }
    });

    console.log('📍 [extractPoints] 最终提取的点数:', points.length);
    console.log('📍 [extractPoints] 前10个点:', points.slice(0, 10));

    return points;
  };

  // 导出绘图为JSON
  const handleExportDrawing = async () => {
    if (!sketchRef.current) return;

    try {
      const paths = await sketchRef.current.exportPaths();
      const points = await extractPointsFromDrawing();
      const epicycles = pointsToEpicycles(points);

      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        paths: paths,
        points: points,
        epicycles: epicycles.slice(0, 50), // 只保存前50个最重要的周转圆
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `drawing-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  // 导入绘图JSON
  const handleImportDrawing = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (importData.paths && sketchRef.current) {
        await sketchRef.current.loadPaths(importData.paths);
      }

      // 清空file input
      event.target.value = '';
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败，请确保文件格式正确');
    }
  };

  // 导入 SVG 文件
  const handleImportSVG = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      console.log('📄 [SVG导入] 原始内容:', text.substring(0, 200));

      // 提取 SVG 中的 path 元素
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(text, 'image/svg+xml');
      const pathElements = svgDoc.querySelectorAll('path');

      if (svgDoc.querySelector('parsererror')) {
        throw new Error('无法解析 SVG 文件');
      }

      console.log('📄 [SVG导入] 找到的 path 数量:', pathElements.length);

      const pathDataList = Array.from(pathElements)
        .map((element) => element.getAttribute('d'))
        .filter((d): d is string => !!d && d.trim().length > 0);

      if (pathDataList.length === 0) {
        alert('SVG 文件中没有找到 path 元素！');
        return;
      }

      console.log('📄 [SVG导入] Path data 样例:', pathDataList[0].substring(0, 200));

      // 解析 SVG path 为点
      const { parseSVGPath } = await import('../utils/svgPathParser');
      const parsedPaths = pathDataList
        .map((data) => parseSVGPath(data))
        .filter((points) => points.length > 0);

      if (parsedPaths.length === 0) {
        alert('无法从 SVG path 中提取点！');
        return;
      }

      const normalizedPaths = normalizeSvgPaths(parsedPaths);
      const totalPoints = normalizedPaths.reduce((acc, path) => acc + path.length, 0);
      console.log('📄 [SVG导入] 解析的总点数:', totalPoints);
      console.log('📄 [SVG导入] 首条路径前5个点:', normalizedPaths[0].slice(0, 5));

      // 将点转换为 react-sketch-canvas 的路径格式
      const canvasPaths = normalizedPaths.map((path) => ({
        drawMode: false,
        strokeColor: '#3b82f6',
        strokeWidth: 4,
        paths: path.map((point) => ({ x: point.x, y: point.y })),
      }));

      // 加载到画布
      if (sketchRef.current) {
        sketchRef.current.resetCanvas();
        sketchRef.current.loadPaths(canvasPaths);
      }

      setResultMnemonic(null);
      setProgress({ generation: 0, fitness: 0 });

      const previewUrl = URL.createObjectURL(file);
      setSvgPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return previewUrl;
      });

      setImportedSvgMeta({
        name: file.name,
        pathCount: normalizedPaths.length,
        pointCount: totalPoints,
      });

      // 清空file input
      event.target.value = '';
    } catch (error) {
      console.error('❌ [SVG导入] 失败:', error);
      alert('SVG 导入失败，请确保文件格式正确');
    }
  };

  const handleSolve = async () => {
    setIsProcessing(true);
    setResultMnemonic(null);

    try {
      // 1. 提取绘图点
      console.log('🚀 [handleSolve] 开始提取绘图点...');
      const points = await extractPointsFromDrawing();
      console.log('🚀 [handleSolve] 提取到的点数:', points.length);

      if (points.length === 0) {
        alert('请先绘制一个图形！');
        setIsProcessing(false);
        return;
      }

      setProgress({ generation: 0, fitness: 0.5 });

      // 2. 使用 FFT 将点转换为周转圆
      console.log('🚀 [handleSolve] 开始 FFT 转换...');
      const epicycles = pointsToEpicycles(points);
      console.log('🚀 [handleSolve] 生成的周转圆数量:', epicycles.length);

      setProgress({ generation: 40, fitness: 0.75 });

      // 3. 将周转圆量化为助记词
      console.log('🚀 [handleSolve] 开始量化为助记词...');
      const mnemonic = epicyclesToMnemonic(epicycles);
      console.log('🚀 [handleSolve] 生成的助记词:', mnemonic);

      setProgress({ generation: 80, fitness: 1 });

      setResultMnemonic(mnemonic);
    } catch (error) {
      console.error('❌ [handleSolve] 求解失败:', error);
      alert('求解失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    sketchRef.current?.clearCanvas();
    setResultMnemonic(null);
    setProgress({ generation: 0, fitness: 0 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">画图生成助记词</h1>
            <p className="text-slate-300 mt-2">Draw to Generate Mnemonic</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            ← 返回生成器
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Drawing Canvas */}
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-3">绘图区域</h2>
              <div
                ref={canvasWrapperRef}
                className="bg-white rounded-lg overflow-hidden border-4 border-slate-600"
              >
                <ReactSketchCanvas
                  ref={sketchRef}
                  width="100%"
                  height="400px"
                  strokeWidth={4}
                  strokeColor="#3b82f6"
                  canvasColor="#ffffff"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleClear}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  清空画布
                </button>
                <button
                  onClick={() => sketchRef.current?.undo()}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  撤销
                </button>
                <button
                  onClick={() => sketchRef.current?.redo()}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  重做
                </button>
              </div>

              {/* Import/Export Buttons */}
              <div className="flex flex-wrap gap-3 mt-3">
                <button
                  onClick={handleExportDrawing}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                >
                  📥 导出绘图
                </button>
                <label className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm cursor-pointer text-center">
                  📤 导入绘图
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportDrawing}
                    className="hidden"
                  />
                </label>
                <label className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm cursor-pointer text-center">
                  🧷 导入 SVG
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={handleImportSVG}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {svgPreviewUrl && importedSvgMeta && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-white">导入的 SVG 预览</h2>
                  <span className="text-xs text-slate-300 truncate max-w-[60%]">
                    {importedSvgMeta.name}
                  </span>
                </div>
                <div className="bg-white rounded border border-slate-200 overflow-hidden flex items-center justify-center h-48">
                  <img
                    src={svgPreviewUrl}
                    alt={importedSvgMeta.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="text-xs text-slate-400 mt-3 flex gap-4">
                  <span>路径数: {importedSvgMeta.pathCount}</span>
                  <span>采样点: {importedSvgMeta.pointCount}</span>
                </div>
              </div>
            )}

            {/* Solve Button */}
            <button
              onClick={handleSolve}
              disabled={isProcessing}
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors shadow-lg disabled:cursor-not-allowed"
            >
              {isProcessing ? '🧬 AI 正在匹配中...' : '🎯 开始匹配助记词'}
            </button>

            {/* Progress */}
            {isProcessing && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex justify-between text-sm text-slate-300 mb-2">
                  <span>进化代数: {progress.generation}/80</span>
                  <span>适应度: {(progress.fitness * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.generation / 80) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Result Canvas */}
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-3">
                匹配结果 (傅立叶图形)
              </h2>
              <div className="bg-white rounded-lg overflow-hidden border-4 border-slate-600">
                <canvas
                  ref={resultCanvasRef}
                  width={800}
                  height={400}
                  className="w-full"
                  style={{ height: '400px' }}
                />
              </div>
            </div>

            {/* Result Mnemonic */}
            {resultMnemonic && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-lg font-semibold text-white mb-3">
                  ✨ 生成的助记词
                </h2>
                <div className="bg-slate-900 rounded p-4 font-mono text-sm text-slate-200 break-all">
                  {resultMnemonic}
                </div>
                <p className="text-xs text-yellow-400 mt-3">
                  ⚠️ 此助记词由遗传算法生成，尽可能匹配您绘制的图形
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <h3 className="text-sm font-semibold text-white mb-2">使用说明</h3>
              <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                <li>在左侧画布中绘制一个封闭的图形（如字母、数字、符号）</li>
                <li>点击"开始匹配"按钮，使用傅立叶变换（FFT）分析绘图</li>
                <li>算法将路径点转为复数序列，提取频率分量</li>
                <li>将傅立叶系数量化为最接近的 BIP39 单词</li>
                <li>右侧将显示生成的助记词对应的傅立叶图形</li>
                <li>支持导出/导入绘图为 JSON 文件</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

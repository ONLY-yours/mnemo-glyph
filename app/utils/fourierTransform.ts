import fft from 'fft-js';
import { Point } from './svgPathParser';

// 调试：检查 fft-js 导入
console.log('🔧 [fourierTransform] fft-js 导入检查:', typeof fft);
console.log('🔧 [fourierTransform] fft.fft 存在?', typeof fft.fft);
console.log('🔧 [fourierTransform] fft 对象:', fft);

export interface Epicycle {
  amplitude: number;  // 半径
  frequency: number;  // 频率（角速度）
  phase: number;      // 初始相位
}

/**
 * 手动实现复数 FFT（因为 fft-js 只支持实数）
 * 参考 Python 的 numpy.fft.fft 实现
 */
function complexFFT(complexPoints: { re: number; im: number }[]): { re: number; im: number }[] {
  const N = complexPoints.length;

  console.log('🔍 [complexFFT] 输入点数:', N);
  console.log('🔍 [complexFFT] 是否为2的幂:', Number.isInteger(Math.log2(N)));

  // 确保输入长度是 2 的幂次
  const fftSize = Math.pow(2, Math.ceil(Math.log2(N)));
  console.log('🔍 [complexFFT] FFT 大小 (2的幂):', fftSize);

  // 对实部和虚部分别做 FFT，需要填充到 2 的幂次
  const realSignal: number[] = [];
  const imagSignal: number[] = [];

  for (let i = 0; i < fftSize; i++) {
    if (i < N) {
      realSignal.push(complexPoints[i].re);
      imagSignal.push(complexPoints[i].im);
    } else {
      // 零填充
      realSignal.push(0);
      imagSignal.push(0);
    }
  }

  console.log('🔍 [complexFFT] 实部信号长度:', realSignal.length);
  console.log('🔍 [complexFFT] 虚部信号长度:', imagSignal.length);
  console.log('🔍 [complexFFT] 实部前5个:', realSignal.slice(0, 5));
  console.log('🔍 [complexFFT] 虚部前5个:', imagSignal.slice(0, 5));

  const realFFT = fft.fft(realSignal);
  const imagFFT = fft.fft(imagSignal);

  console.log('🔍 [complexFFT] FFT 结果长度 (实部):', realFFT.length);
  console.log('🔍 [complexFFT] FFT 结果长度 (虚部):', imagFFT.length);

  // 合并结果：FFT(a + bi) = FFT(a) + i*FFT(b)
  const result: { re: number; im: number }[] = [];

  for (let i = 0; i < N; i++) {
    // realFFT[i] = [re1, im1], imagFFT[i] = [re2, im2]
    // 结果 = (re1 + i*im1) + i*(re2 + i*im2)
    //      = (re1 - im2) + i*(im1 + re2)
    result.push({
      re: realFFT[i][0] - imagFFT[i][1],
      im: realFFT[i][1] + imagFFT[i][0],
    });
  }

  console.log('✅ [complexFFT] 成功，结果长度:', result.length);

  return result;
}

/**
 * 从点序列生成傅立叶周转圆
 * 这是核心算法，模仿 Python 版本的实现
 */
export function pointsToEpicycles(points: Point[]): Epicycle[] {
  console.log('🎨 [pointsToEpicycles] 开始处理，点数:', points.length);

  if (points.length === 0) {
    console.warn('⚠️ [pointsToEpicycles] 点数为0，返回空数组');
    return [];
  }

  console.log('🎨 [pointsToEpicycles] 前5个点:', points.slice(0, 5));

  // 1. 计算中心点
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  console.log('🎨 [pointsToEpicycles] 中心点:', { centerX, centerY });

  // 2. 转为复数数组 (相对于中心点)
  // Python: complex(x - centerX, y - centerY)
  const complexPoints = points.map(p => ({
    re: p.x - centerX,  // 实部
    im: p.y - centerY,  // 虚部
  }));

  console.log('🎨 [pointsToEpicycles] 复数点前5个:', complexPoints.slice(0, 5));

  // 3. 执行复数 FFT
  const fftResult = complexFFT(complexPoints);
  const N = points.length;

  console.log('🎨 [pointsToEpicycles] FFT 完成，系数数量:', fftResult.length);

  // 4. 将每个 FFT 系数转换为周转圆
  // Python 代码中每个系数生成两个圆（实部和虚部）
  const epicycles: Epicycle[] = [];

  for (let i = 0; i < fftResult.length; i++) {
    const { re, im } = fftResult[i];
    const freq = -2 * Math.PI * i / N;  // 频率

    // 实部周转圆
    epicycles.push({
      amplitude: -re / N,
      frequency: freq,
      phase: Math.PI / 2,  // π/2
    });

    // 虚部周转圆
    epicycles.push({
      amplitude: -im / N,
      frequency: freq,
      phase: 0,  // 0
    });
  }

  // 5. 按振幅排序（从大到小）
  epicycles.sort((a, b) => Math.abs(b.amplitude) - Math.abs(a.amplitude));

  return epicycles;
}

/**
 * 计算给定时刻 t 的位置（所有周转圆的叠加）
 */
export function calculatePosition(epicycles: Epicycle[], t: number): Point {
  let x = 0;
  let y = 0;

  for (const { amplitude, frequency, phase } of epicycles) {
    const angle = frequency * t + phase;
    x += amplitude * Math.cos(angle);
    y += amplitude * Math.sin(angle);
  }

  return { x, y };
}

/**
 * 生成完整路径点
 */
export function generatePath(epicycles: Epicycle[], numPoints: number = 1000): Point[] {
  const path: Point[] = [];

  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * 2 * Math.PI;
    path.push(calculatePosition(epicycles, t));
  }

  return path;
}

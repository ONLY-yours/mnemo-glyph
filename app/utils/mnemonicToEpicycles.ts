import { wordlists } from 'bip39';
import { Epicycle } from './fourierTransform';

const ROWS = 32;   // 相位分区
const COLS = 64;   // 振幅分区

/**
 * 将 BIP39 助记词转换为周转圆数组
 * 映射策略：
 * - 单词索引 → (row, col)
 * - row → phase (0 到 2π)
 * - col → amplitude (归一化)
 * - frequency = k (单词位置决定频率)
 */
export function mnemonicToEpicycles(mnemonic: string): Epicycle[] {
  const wordList = wordlists.english;
  const wordToIndex = new Map<string, number>();
  wordList.forEach((word, index) => {
    wordToIndex.set(word, index);
  });

  const words = mnemonic.split(' ');
  const indices = words.map(word => wordToIndex.get(word) ?? 0);

  return indices.map((index, k) => {
    const row = Math.floor(index / COLS);  // 0-31
    const col = index % COLS;              // 0-63

    const phase = (row / ROWS) * 2 * Math.PI;  // 相位: 0 到 2π
    const amplitude = 0.1 + (col / COLS) * 0.9; // 振幅: 0.1 到 1.0
    const frequency = -2 * Math.PI * k / indices.length;  // 频率

    return { amplitude, frequency, phase };
  });
}

/**
 * 将周转圆参数量化为最接近的 BIP39 单词索引
 */
export function epicycleToWordIndex(epicycle: Epicycle, totalWords: number): number {
  // 从频率反推位置 k
  const k = Math.round((-epicycle.frequency * totalWords) / (2 * Math.PI));

  // 从相位反推 row
  const normalizedPhase = ((epicycle.phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const row = Math.round((normalizedPhase / (2 * Math.PI)) * (ROWS - 1));

  // 从振幅反推 col
  const normalizedAmplitude = Math.max(0.1, Math.min(1.0, epicycle.amplitude));
  const col = Math.round(((normalizedAmplitude - 0.1) / 0.9) * (COLS - 1));

  const index = row * COLS + col;
  return Math.max(0, Math.min(2047, index));
}

/**
 * 将周转圆数组转换为 BIP39 助记词
 */
export function epicyclesToMnemonic(epicycles: Epicycle[]): string {
  const wordList = wordlists.english;

  // 按频率排序（恢复原始顺序）
  const sorted = [...epicycles].sort((a, b) => b.frequency - a.frequency);

  // 取前12个（或更多，取决于输入）
  const words = sorted.slice(0, 12).map(epicycle => {
    const index = epicycleToWordIndex(epicycle, 12);
    return wordList[index];
  });

  return words.join(' ');
}

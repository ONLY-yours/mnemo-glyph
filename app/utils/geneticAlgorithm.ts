import { wordlists, mnemonicToEntropy, entropyToMnemonic } from 'bip39';

// 遗传算法配置
const GA_CONFIG = {
  POPULATION_SIZE: 100,
  MAX_GENERATIONS: 50,
  MUTATION_RATE: 0.1,
  ELITE_SIZE: 10,
};

interface Epicycle {
  amplitude: number;
  phase: number;
}

// 将助记词转换为周转圆数组
export function mnemonicToEpicycles(mnemonic: string): Epicycle[] {
  const wordList = wordlists.english;
  const wordToIndex = new Map<string, number>();
  wordList.forEach((word, index) => {
    wordToIndex.set(word, index);
  });

  const words = mnemonic.split(' ');
  const indices = words.map(word => wordToIndex.get(word) ?? 0);

  const ROWS = 32;
  const COLS = 64;

  return indices.map(index => {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    const phase = (row / ROWS) * 2 * Math.PI;
    const amplitude = 0.1 + (col / COLS) * 0.9;
    return { amplitude, phase };
  });
}

// 计算两组周转圆的欧氏距离（适应度函数）
function calculateDistance(epicycles1: Epicycle[], epicycles2: Epicycle[]): number {
  let distance = 0;
  const len = Math.min(epicycles1.length, epicycles2.length);

  for (let i = 0; i < len; i++) {
    const da = epicycles1[i].amplitude - epicycles2[i].amplitude;
    const dp = epicycles1[i].phase - epicycles2[i].phase;
    distance += Math.sqrt(da * da + dp * dp);
  }

  return distance;
}

// 生成随机助记词
function generateRandomMnemonic(): string {
  const wordList = wordlists.english;
  const words: string[] = [];

  // 生成11个随机单词
  for (let i = 0; i < 11; i++) {
    const randomIndex = Math.floor(Math.random() * wordList.length);
    words.push(wordList[randomIndex]);
  }

  // 计算校验和并添加第12个单词
  try {
    const entropy = Buffer.from(words.map((_, i) => Math.floor(Math.random() * 256)));
    return entropyToMnemonic(entropy);
  } catch {
    // 如果失败，使用完全随机的12个单词（忽略校验）
    words.push(wordList[Math.floor(Math.random() * wordList.length)]);
    return words.join(' ');
  }
}

// 交叉操作
function crossover(parent1: string, parent2: string): string {
  const words1 = parent1.split(' ');
  const words2 = parent2.split(' ');
  const crossoverPoint = Math.floor(Math.random() * 11);

  const childWords = [
    ...words1.slice(0, crossoverPoint),
    ...words2.slice(crossoverPoint, 11),
  ];

  // 尝试生成合法的第12个单词
  try {
    const wordList = wordlists.english;
    childWords.push(wordList[Math.floor(Math.random() * wordList.length)]);
    return childWords.join(' ');
  } catch {
    return childWords.join(' ') + ' ' + wordlists.english[0];
  }
}

// 变异操作
function mutate(mnemonic: string): string {
  if (Math.random() > GA_CONFIG.MUTATION_RATE) return mnemonic;

  const words = mnemonic.split(' ');
  const mutationPoint = Math.floor(Math.random() * 11);
  const wordList = wordlists.english;
  words[mutationPoint] = wordList[Math.floor(Math.random() * wordList.length)];

  return words.join(' ');
}

// 轮盘赌选择
function selectParent(population: string[], fitnessScores: number[]): string {
  const totalFitness = fitnessScores.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalFitness;

  for (let i = 0; i < population.length; i++) {
    random -= fitnessScores[i];
    if (random <= 0) return population[i];
  }

  return population[population.length - 1];
}

// 主遗传算法
export async function solveForMnemonic(
  targetEpicycles: Epicycle[],
  onProgress?: (generation: number, bestFitness: number) => void
): Promise<string> {
  // 初始化种群
  let population = Array.from({ length: GA_CONFIG.POPULATION_SIZE }, () =>
    generateRandomMnemonic()
  );

  let bestMnemonic = population[0];
  let bestDistance = Infinity;

  for (let generation = 0; generation < GA_CONFIG.MAX_GENERATIONS; generation++) {
    // 计算适应度（距离越小越好）
    const distances = population.map(mnemonic => {
      const epicycles = mnemonicToEpicycles(mnemonic);
      return calculateDistance(epicycles, targetEpicycles);
    });

    // 找到最佳个体
    const minDistance = Math.min(...distances);
    const bestIndex = distances.indexOf(minDistance);

    if (minDistance < bestDistance) {
      bestDistance = minDistance;
      bestMnemonic = population[bestIndex];
    }

    // 报告进度
    if (onProgress) {
      onProgress(generation, 1 / (1 + bestDistance));
    }

    // 精英保留
    const elite = population
      .map((m, i) => ({ mnemonic: m, distance: distances[i] }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, GA_CONFIG.ELITE_SIZE)
      .map(e => e.mnemonic);

    // 适应度分数（距离越小，适应度越高）
    const fitnessScores = distances.map(d => 1 / (1 + d));

    // 生成下一代
    const nextGeneration = [...elite];

    while (nextGeneration.length < GA_CONFIG.POPULATION_SIZE) {
      const parent1 = selectParent(population, fitnessScores);
      const parent2 = selectParent(population, fitnessScores);
      let child = crossover(parent1, parent2);
      child = mutate(child);
      nextGeneration.push(child);
    }

    population = nextGeneration;

    // 允许 UI 更新
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return bestMnemonic;
}

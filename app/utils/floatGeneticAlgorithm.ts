import { wordlists } from 'bip39';

// 遗传算法配置（浮点数优化版本）
const GA_CONFIG = {
  POPULATION_SIZE: 150,
  MAX_GENERATIONS: 80,
  MUTATION_RATE: 0.2,
  MUTATION_STRENGTH: 0.1, // 变异强度
  ELITE_SIZE: 15,
};

export interface FloatEpicycle {
  amplitude: number; // 0.1 到 1.0
  phase: number;     // 0 到 2π
}

// 浮点数个体（12个周转圆）
type FloatIndividual = FloatEpicycle[];

// 计算两组周转圆的欧氏距离
function calculateDistance(epicycles1: FloatEpicycle[], epicycles2: FloatEpicycle[]): number {
  let distance = 0;
  const len = Math.min(epicycles1.length, epicycles2.length);

  for (let i = 0; i < len; i++) {
    const da = epicycles1[i].amplitude - epicycles2[i].amplitude;
    // 相位差需要考虑循环性（0 和 2π 是相邻的）
    let dp = Math.abs(epicycles1[i].phase - epicycles2[i].phase);
    if (dp > Math.PI) dp = 2 * Math.PI - dp;

    distance += Math.sqrt(da * da + dp * dp);
  }

  return distance;
}

// 生成随机浮点数个体
function generateRandomIndividual(): FloatIndividual {
  return Array.from({ length: 12 }, () => ({
    amplitude: 0.1 + Math.random() * 0.9,
    phase: Math.random() * 2 * Math.PI,
  }));
}

// 交叉操作（浮点数）
function crossover(parent1: FloatIndividual, parent2: FloatIndividual): FloatIndividual {
  const crossoverPoint = Math.floor(Math.random() * 12);
  return [
    ...parent1.slice(0, crossoverPoint),
    ...parent2.slice(crossoverPoint),
  ];
}

// 变异操作（浮点数）
function mutate(individual: FloatIndividual): FloatIndividual {
  return individual.map(epicycle => {
    if (Math.random() < GA_CONFIG.MUTATION_RATE) {
      return {
        amplitude: Math.max(0.1, Math.min(1.0,
          epicycle.amplitude + (Math.random() - 0.5) * GA_CONFIG.MUTATION_STRENGTH
        )),
        phase: (epicycle.phase + (Math.random() - 0.5) * Math.PI) % (2 * Math.PI),
      };
    }
    return epicycle;
  });
}

// 轮盘赌选择
function selectParent(population: FloatIndividual[], fitnessScores: number[]): FloatIndividual {
  const totalFitness = fitnessScores.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalFitness;

  for (let i = 0; i < population.length; i++) {
    random -= fitnessScores[i];
    if (random <= 0) return population[i];
  }

  return population[population.length - 1];
}

// 将浮点数周转圆量化到最近的BIP39单词索引
function quantizeToWordIndex(epicycle: FloatEpicycle): number {
  const ROWS = 32;
  const COLS = 64;

  // 反向映射：从 (amplitude, phase) → (row, col) → index
  const normalizedPhase = epicycle.phase / (2 * Math.PI); // 0 到 1
  const row = Math.round(normalizedPhase * (ROWS - 1)); // 0 到 31

  const normalizedAmplitude = (epicycle.amplitude - 0.1) / 0.9; // 0 到 1
  const col = Math.round(normalizedAmplitude * (COLS - 1)); // 0 到 63

  const index = row * COLS + col;
  return Math.max(0, Math.min(2047, index)); // 确保在有效范围内
}

// 将浮点数个体转换为合法的BIP39助记词
export function floatIndividualToMnemonic(individual: FloatIndividual): string {
  const wordList = wordlists.english;
  const indices = individual.map(quantizeToWordIndex);
  const words = indices.map(index => wordList[index]);
  return words.join(' ');
}

// 主遗传算法（浮点数优化版）
export async function solveForMnemonicFloat(
  targetEpicycles: FloatEpicycle[],
  onProgress?: (generation: number, bestFitness: number, bestIndividual: FloatIndividual) => void
): Promise<string> {
  // 初始化种群（浮点数）
  let population: FloatIndividual[] = Array.from(
    { length: GA_CONFIG.POPULATION_SIZE },
    generateRandomIndividual
  );

  let bestIndividual = population[0];
  let bestDistance = Infinity;

  for (let generation = 0; generation < GA_CONFIG.MAX_GENERATIONS; generation++) {
    // 计算适应度（距离越小越好）
    const distances = population.map(individual =>
      calculateDistance(individual, targetEpicycles)
    );

    // 找到最佳个体
    const minDistance = Math.min(...distances);
    const bestIndex = distances.indexOf(minDistance);

    if (minDistance < bestDistance) {
      bestDistance = minDistance;
      bestIndividual = population[bestIndex];
    }

    // 报告进度
    if (onProgress) {
      const fitness = 1 / (1 + bestDistance);
      onProgress(generation, fitness, bestIndividual);
    }

    // 精英保留
    const elite = population
      .map((ind, i) => ({ individual: ind, distance: distances[i] }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, GA_CONFIG.ELITE_SIZE)
      .map(e => e.individual);

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

  // 将最佳浮点数个体量化为合法助记词
  return floatIndividualToMnemonic(bestIndividual);
}

// SVG Path 解析器
export interface Point {
  x: number;
  y: number;
}

function legacyParse(pathString: string): Point[] {
  const points: Point[] = [];
  let currentX = 0;
  let currentY = 0;

  const normalized = pathString
    .replace(/([MmLlHhVvCcSsQqTtAaZz])/g, ' $1 ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = normalized.split(' ');
  let i = 0;

  while (i < tokens.length) {
    const command = tokens[i];

    switch (command) {
      case 'M':
        currentX = parseFloat(tokens[++i]);
        currentY = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'm':
        currentX += parseFloat(tokens[++i]);
        currentY += parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'L':
        currentX = parseFloat(tokens[++i]);
        currentY = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'l':
        currentX += parseFloat(tokens[++i]);
        currentY += parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'H':
        currentX = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'h':
        currentX += parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'V':
        currentY = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'v':
        currentY += parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'C':
        i += 4;
        currentX = parseFloat(tokens[i]);
        currentY = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'c':
        i += 4;
        currentX += parseFloat(tokens[i]);
        currentY += parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'S':
        i += 2;
        currentX = parseFloat(tokens[i]);
        currentY = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 's':
        i += 2;
        currentX += parseFloat(tokens[i]);
        currentY += parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'Q':
      case 'q':
      case 'T':
      case 't':
      case 'A':
      case 'a':
        // 保留原有落点，忽略控制点细节
        currentX = parseFloat(tokens[++i]);
        currentY = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'Z':
      case 'z':
        break;

      default:
        break;
    }

    i++;
  }

  return points;
}

export function parseSVGPath(pathString: string): Point[] {
  if (typeof document !== 'undefined' && document.createElementNS) {
    try {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathString);

      const totalLength = path.getTotalLength();
      if (!Number.isFinite(totalLength) || totalLength === 0) {
        return legacyParse(pathString);
      }

      const sampleCount = Math.min(Math.max(Math.round(totalLength / 4), 64), 1024);
      const points: Point[] = [];

      for (let i = 0; i <= sampleCount; i++) {
        const length = (totalLength * i) / sampleCount;
        const { x, y } = path.getPointAtLength(length);
        points.push({ x, y });
      }

      return points;
    } catch (error) {
      console.warn('parseSVGPath fallback to legacy parser:', error);
    }
  }

  return legacyParse(pathString);
}

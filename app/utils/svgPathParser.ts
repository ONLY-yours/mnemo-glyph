// SVG Path 解析器
export interface Point {
  x: number;
  y: number;
}

export function parseSVGPath(pathString: string): Point[] {
  const points: Point[] = [];
  let currentX = 0;
  let currentY = 0;

  // 移除多余空格，规范化路径字符串
  const normalized = pathString
    .replace(/([MmLlHhVvCcSsZz])/g, ' $1 ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = normalized.split(' ');
  let i = 0;

  while (i < tokens.length) {
    const command = tokens[i];

    switch (command) {
      case 'M': // Move to (absolute)
        currentX = parseFloat(tokens[++i]);
        currentY = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'm': // Move to (relative)
        currentX += parseFloat(tokens[++i]);
        currentY += parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'L': // Line to (absolute)
        currentX = parseFloat(tokens[++i]);
        currentY = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'l': // Line to (relative)
        currentX += parseFloat(tokens[++i]);
        currentY += parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'H': // Horizontal line (absolute)
        currentX = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'h': // Horizontal line (relative)
        currentX += parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'V': // Vertical line (absolute)
        currentY = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'v': // Vertical line (relative)
        currentY += parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'C': // Cubic Bezier (absolute) - 取终点
        i += 4; // 跳过两个控制点
        currentX = parseFloat(tokens[i]);
        currentY = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'c': // Cubic Bezier (relative) - 取终点
        i += 4;
        currentX += parseFloat(tokens[i]);
        currentY += parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'S': // Smooth Cubic Bezier (absolute) - 取终点
        i += 2; // 跳过一个控制点
        currentX = parseFloat(tokens[i]);
        currentY = parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 's': // Smooth Cubic Bezier (relative) - 取终点
        i += 2;
        currentX += parseFloat(tokens[i]);
        currentY += parseFloat(tokens[++i]);
        points.push({ x: currentX, y: currentY });
        break;

      case 'Z':
      case 'z':
        // Close path - 不添加点
        break;

      default:
        // 跳过未知命令
        break;
    }

    i++;
  }

  return points;
}

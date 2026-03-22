import { Unit } from '../objects/Unit'
import { GameMap } from '../map/GameMap'
import { PathNode } from '../objects/Unit'

/**
 * A* 路径寻路算法实现
 */
export class Pathfinder {
  private map: GameMap
  
  constructor(map: GameMap) {
    this.map = map
  }
  
  /**
   * 寻找从起点到终点的路径
   * 
   * @param startX 起始X坐标（单元格）
   * @param startY 起始Y坐标（单元格）
   * @param endX 目标X坐标（单元格）
   * @param endY 目标Y坐标（单元格）
   * @param unit 移动的单位（用于判断可通过性）
   * @returns 路径节点数组，如果无法到达返回空数组
   */
  findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    unit: Unit
  ): PathNode[] {
    // 边界检查
    if (!this.map.isValidCell(endX, endY)) {
      return []
    }
    
    // 目标不可通过
    if (!this.map.isPassable(endX, endY, unit)) {
      // 尝试找附近可到达的点
      const nearby = this.findNearbyPassableCell(endX, endY, unit)
      if (nearby) {
        endX = nearby.x
        endY = nearby.y
      } else {
        return []
      }
    }
    
    // 起点就是终点
    if (startX === endX && startY === endY) {
      return []
    }
    
    // A*算法
    const openList: PathNode[] = []
    const closedList: Set<string> = new Set()
    
    const startNode: PathNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0,
    }
    startNode.f = startNode.g + startNode.h
    openList.push(startNode)
    
    const nodeMap = new Map<string, PathNode>()
    nodeMap.set(`${startX},${startY}`, startNode)
    
    while (openList.length > 0) {
      // 找到f值最小的节点
      let currentIndex = 0
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[currentIndex].f) {
          currentIndex = i
        }
      }
      
      const currentNode = openList[currentIndex]
      
      // 到达目标
      if (currentNode.x === endX && currentNode.y === endY) {
        return this.reconstructPath(currentNode)
      }
      
      // 移到关闭列表
      openList.splice(currentIndex, 1)
      closedList.add(`${currentNode.x},${currentNode.y}`)
      
      // 检查邻居
      const neighbors = this.getNeighbors(currentNode.x, currentNode.y)
      
      for (const neighbor of neighbors) {
        const { x, y, cost } = neighbor
        
        // 已经在关闭列表中
        if (closedList.has(`${x},${y}`)) {
          continue
        }
        
        // 不可通过
        if (!this.map.isPassable(x, y, unit)) {
          continue
        }
        
        const tentativeG = currentNode.g + cost
        const existingNode = nodeMap.get(`${x},${y}`)
        
        if (!existingNode) {
          // 新节点
          const newNode: PathNode = {
            x,
            y,
            g: tentativeG,
            h: this.heuristic(x, y, endX, endY),
            f: 0,
            parent: currentNode,
          }
          newNode.f = newNode.g + newNode.h
          nodeMap.set(`${x},${y}`, newNode)
          openList.push(newNode)
        } else if (tentativeG < existingNode.g) {
          // 找到更优路径
          existingNode.g = tentativeG
          existingNode.f = existingNode.g + existingNode.h
          existingNode.parent = currentNode
        }
      }
    }
    
    // 无法到达
    return []
  }
  
  /**
   * 启发式函数 - 曼哈顿距离
   */
  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2)
  }
  
  /**
   * 获取邻居节点
   * 包括8个方向：上下左右 + 对角线
   */
  private getNeighbors(x: number, y: number): Array<{ x: number; y: number; cost: number }> {
    const neighbors: Array<{ x: number; y: number; cost: number }> = []
    
    // 4个主要方向（上下左右）
    const directions = [
      { x: 0, y: -1, cost: 10 },  // 上
      { x: 1, y: 0, cost: 10 },   // 右
      { x: 0, y: 1, cost: 10 },   // 下
      { x: -1, y: 0, cost: 10 },  // 左
    ]
    
    // 4个对角线方向
    const diagonals = [
      { x: -1, y: -1, cost: 14 }, // 左上
      { x: 1, y: -1, cost: 14 },  // 右上
      { x: 1, y: 1, cost: 14 },   // 右下
      { x: -1, y: 1, cost: 14 },  // 左下
    ]
    
    // 添加主要方向
    for (const dir of directions) {
      const nx = x + dir.x
      const ny = y + dir.y
      if (this.map.isValidCell(nx, ny)) {
        neighbors.push({ x: nx, y: ny, cost: dir.cost })
      }
    }
    
    // 添加对角线方向（检查是否被阻挡）
    for (const dir of diagonals) {
      const nx = x + dir.x
      const ny = y + dir.y
      
      // 检查两个相邻的主方向是否都可通过
      const canMoveHorizontal = this.map.isValidCell(x + dir.x, y) && 
                               !this.map.isCellBlocked(x + dir.x, y)
      const canMoveVertical = this.map.isValidCell(x, y + dir.y) && 
                             !this.map.isCellBlocked(x, y + dir.y)
      
      if (canMoveHorizontal && canMoveVertical && this.map.isValidCell(nx, ny)) {
        neighbors.push({ x: nx, y: ny, cost: dir.cost })
      }
    }
    
    return neighbors
  }
  
  /**
   * 重建路径
   */
  private reconstructPath(endNode: PathNode): PathNode[] {
    const path: PathNode[] = []
    let current: PathNode | undefined = endNode
    
    while (current) {
      path.unshift({
        x: current.x,
        y: current.y,
        g: current.g,
        h: current.h,
        f: current.f,
      })
      current = current.parent
    }
    
    return path
  }
  
  /**
   * 查找附近可通过的单元格
   */
  private findNearbyPassableCell(
    targetX: number,
    targetY: number,
    unit: Unit,
    maxRadius: number = 5
  ): { x: number; y: number } | null {
    for (let radius = 1; radius <= maxRadius; radius++) {
      // 螺旋搜索
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) + Math.abs(dy) > radius) continue
          
          const x = targetX + dx
          const y = targetY + dy
          
          if (this.map.isValidCell(x, y) && this.map.isPassable(x, y, unit)) {
            return { x, y }
          }
        }
      }
    }
    return null
  }
  
  /**
   * 平滑路径 - 移除不必要的拐点
   */
  smoothPath(path: PathNode[], unit: Unit): PathNode[] {
    if (path.length <= 2) return path
    
    const smoothed: PathNode[] = [path[0]]
    let currentIndex = 0
    
    while (currentIndex < path.length - 1) {
      // 尝试找到最远的可直接到达的点
      let furthestIndex = currentIndex + 1
      
      for (let i = path.length - 1; i > currentIndex; i--) {
        if (this.hasLineOfSight(path[currentIndex], path[i], unit)) {
          furthestIndex = i
          break
        }
      }
      
      smoothed.push(path[furthestIndex])
      currentIndex = furthestIndex
    }
    
    return smoothed
  }
  
  /**
   * 检查两点之间是否有直线视野（无障碍）
   */
  private hasLineOfSight(start: PathNode, end: PathNode, unit: Unit): boolean {
    const dx = Math.abs(end.x - start.x)
    const dy = Math.abs(end.y - start.y)
    
    let x = start.x
    let y = start.y
    
    const xStep = start.x < end.x ? 1 : -1
    const yStep = start.y < end.y ? 1 : -1
    
    let err = dx - dy
    
    while (x !== end.x || y !== end.y) {
      if (x !== start.x || y !== start.y) {
        if (!this.map.isPassable(x, y, unit)) {
          return false
        }
      }
      
      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x += xStep
      }
      if (e2 < dx) {
        err += dx
        y += yStep
      }
    }
    
    return true
  }
  
  /**
   * 为多个单位计算编队移动路径
   * 避免单位挤在一起
   */
  findFormationPaths(
    units: Unit[],
    targetCenterX: number,
    targetCenterY: number
  ): Map<Unit, PathNode[]> {
    const paths = new Map<Unit, PathNode[]>()
    
    // 计算编队阵型
    const formation = this.calculateFormation(units, targetCenterX, targetCenterY)
    
    for (const unit of units) {
      const targetPos = formation.get(unit)
      if (targetPos) {
        const startX = Math.floor(unit.position.x)
        const startY = Math.floor(unit.position.z)
        const path = this.findPath(
          startX,
          startY,
          targetPos.x,
          targetPos.y,
          unit
        )
        
        if (path.length > 0) {
          paths.set(unit, path)
        }
      }
    }
    
    return paths
  }
  
  /**
   * 计算编队阵型
   */
  private calculateFormation(
    units: Unit[],
    centerX: number,
    centerY: number
  ): Map<Unit, { x: number; y: number }> {
    const formation = new Map<Unit, { x: number; y: number }>()
    const count = units.length
    
    if (count === 1) {
      formation.set(units[0], { x: centerX, y: centerY })
      return formation
    }
    
    // 简单网格阵型
    const cols = Math.ceil(Math.sqrt(count))
    const startX = centerX - Math.floor(cols / 2)
    const startY = centerY - Math.floor(count / cols / 2)
    
    let index = 0
    for (const unit of units) {
      const col = index % cols
      const row = Math.floor(index / cols)
      formation.set(unit, {
        x: startX + col,
        y: startY + row,
      })
      index++
    }
    
    return formation
  }
  
  /**
   * 避障路径重计算
   * 当单位发现路径上有新障碍物时调用
   */
  recalculatePath(unit: Unit, endX: number, endY: number): PathNode[] {
    const startX = Math.floor(unit.position.x)
    const startY = Math.floor(unit.position.z)
    return this.findPath(startX, startY, endX, endY, unit)
  }
}

/**
 * 寻路服务
 * 
 * 提供 A* 寻路算法和路径优化
 */

import { EntityId } from '../core/Entity'
import { MovementType, PathNode } from '../core/Component'

export interface PathfindingOptions {
  movementType: MovementType
  entityId?: EntityId
  avoidEntities?: boolean
  maxIterations?: number
}

export interface GameMap {
  getWidth(): number
  getHeight(): number
  isValidCell(x: number, y: number): boolean
  isPassable(x: number, y: number, movementType: MovementType): boolean
  getHeightAt(x: number, y: number): number
}

export class PathfindingService {
  private map: GameMap
  private maxIterations: number = 10000
  
  constructor(map: GameMap) {
    this.map = map
  }
  
  /**
   * A* 寻路算法
   */
  findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    options: PathfindingOptions
  ): PathNode[] {
    // 边界检查
    if (!this.map.isValidCell(endX, endY)) {
      return []
    }
    
    // 目标不可通过，寻找附近可达点
    if (!this.map.isPassable(endX, endY, options.movementType)) {
      const nearby = this.findNearbyPassable(endX, endY, options)
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
    
    return this.aStar(startX, startY, endX, endY, options)
  }
  
  private aStar(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    options: PathfindingOptions
  ): PathNode[] {
    const openList: PathNode[] = []
    const closedList = new Set<string>()
    const nodeMap = new Map<string, PathNode>()
    
    const startNode: PathNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0
    }
    startNode.f = startNode.g + startNode.h
    
    openList.push(startNode)
    nodeMap.set(`${startX},${startY}`, startNode)
    
    let iterations = 0
    const maxIter = options.maxIterations || this.maxIterations
    
    while (openList.length > 0 && iterations < maxIter) {
      iterations++
      
      // 找到f值最小的节点
      let currentIndex = 0
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f! < openList[currentIndex].f!) {
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
        const key = `${x},${y}`
        
        // 已在关闭列表
        if (closedList.has(key)) continue
        
        // 不可通过
        if (!this.map.isPassable(x, y, options.movementType)) continue
        
        const tentativeG = currentNode.g! + cost
        const existingNode = nodeMap.get(key)
        
        if (!existingNode) {
          // 新节点
          const newNode: PathNode = {
            x,
            y,
            g: tentativeG,
            h: this.heuristic(x, y, endX, endY),
            f: 0,
            parent: currentNode
          }
          newNode.f = newNode.g! + newNode.h!
          nodeMap.set(key, newNode)
          openList.push(newNode)
        } else if (tentativeG < existingNode.g!) {
          // 找到更优路径
          existingNode.g = tentativeG
          existingNode.f = existingNode.g + existingNode.h!
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
   * 获取邻居节点（8方向）
   */
  private getNeighbors(x: number, y: number): Array<{ x: number; y: number; cost: number }> {
    const neighbors: Array<{ x: number; y: number; cost: number }> = []
    
    // 4个主要方向
    const directions = [
      { x: 0, y: -1, cost: 10 },  // 上
      { x: 1, y: 0, cost: 10 },   // 右
      { x: 0, y: 1, cost: 10 },   // 下
      { x: -1, y: 0, cost: 10 }   // 左
    ]
    
    // 4个对角线方向
    const diagonals = [
      { x: -1, y: -1, cost: 14 },
      { x: 1, y: -1, cost: 14 },
      { x: 1, y: 1, cost: 14 },
      { x: -1, y: 1, cost: 14 }
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
      if (this.map.isValidCell(x + dir.x, y) && 
          this.map.isValidCell(x, y + dir.y)) {
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
        f: current.f
      })
      current = current.parent
    }
    
    return path
  }
  
  /**
   * 查找附近可通过的单元格
   */
  private findNearbyPassable(
    targetX: number,
    targetY: number,
    options: PathfindingOptions,
    maxRadius: number = 5
  ): { x: number; y: number } | null {
    for (let radius = 1; radius <= maxRadius; radius++) {
      // 螺旋搜索
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
          
          const x = targetX + dx
          const y = targetY + dy
          
          if (this.map.isValidCell(x, y) && 
              this.map.isPassable(x, y, options.movementType)) {
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
  smoothPath(path: PathNode[], movementType: MovementType): PathNode[] {
    if (path.length <= 2) return path
    
    const smoothed: PathNode[] = [path[0]]
    let currentIndex = 0
    
    while (currentIndex < path.length - 1) {
      // 尝试找到最远的可直接到达的点
      let furthestIndex = currentIndex + 1
      
      for (let i = path.length - 1; i > currentIndex; i--) {
        if (this.hasLineOfSight(path[currentIndex], path[i], movementType)) {
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
   * 检查两点之间是否有直线视野
   */
  private hasLineOfSight(
    start: PathNode, 
    end: PathNode, 
    movementType: MovementType
  ): boolean {
    const dx = Math.abs(end.x - start.x)
    const dy = Math.abs(end.y - start.y)
    
    let x = start.x
    let y = start.y
    
    const xStep = start.x < end.x ? 1 : -1
    const yStep = start.y < end.y ? 1 : -1
    
    let err = dx - dy
    
    while (x !== end.x || y !== end.y) {
      if (x !== start.x || y !== start.y) {
        if (!this.map.isPassable(x, y, movementType)) {
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
   * 编队寻路 - 为多个单位计算不冲突的路径
   */
  findFormationPaths(
    startPositions: { entityId: EntityId; x: number; y: number }[],
    targetCenterX: number,
    targetCenterY: number,
    options: PathfindingOptions
  ): Map<EntityId, PathNode[]> {
    const paths = new Map<EntityId, PathNode[]>()
    
    // 计算编队阵型
    const formation = this.calculateFormation(
      startPositions.length,
      targetCenterX,
      targetCenterY
    )
    
    for (let i = 0; i < startPositions.length; i++) {
      const { entityId, x, y } = startPositions[i]
      const target = formation[i]
      
      const path = this.findPath(
        Math.floor(x),
        Math.floor(y),
        target.x,
        target.y,
        options
      )
      
      if (path.length > 0) {
        paths.set(entityId, path)
      }
    }
    
    return paths
  }
  
  /**
   * 计算编队阵型
   */
  private calculateFormation(
    count: number,
    centerX: number,
    centerY: number
  ): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = []
    
    if (count === 1) {
      return [{ x: centerX, y: centerY }]
    }
    
    // 网格阵型
    const cols = Math.ceil(Math.sqrt(count))
    const startX = centerX - Math.floor(cols / 2)
    const startY = centerY - Math.floor(count / cols / 2)
    
    for (let i = 0; i < count; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      positions.push({
        x: startX + col,
        y: startY + row
      })
    }
    
    return positions
  }
}

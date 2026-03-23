/**
 * 寻路服务
 * 
 * Week 3: 基础服务
 * 基于A*算法的路径寻找服务
 */

import { Vector3 } from '../../game/types'
import { GameMap } from '../../game/map/GameMap'

// 路径节点
export interface PathNode {
  x: number
  y: number
  g: number      // 从起点到当前节点的代价
  h: number      // 启发式估计值
  f: number      // g + h
  parent?: PathNode
}

// 寻路选项
export interface PathfindingOptions {
  // 是否允许对角线移动
  allowDiagonal?: boolean
  // 最大搜索节点数（防止卡顿）
  maxIterations?: number
  // 最大路径长度
  maxPathLength?: number
  // 单位移动类型
  movementType?: 'foot' | 'track' | 'wheel' | 'hover' | 'fly'
}

// 默认选项
const DEFAULT_OPTIONS: PathfindingOptions = {
  allowDiagonal: true,
  maxIterations: 1000,
  maxPathLength: 100,
  movementType: 'track'
}

export class PathfindingService {
  private map: GameMap

  constructor(map: GameMap) {
    this.map = map
  }

  /**
   * 寻找路径
   * @param start 起点
   * @param end 终点
   * @param options 寻路选项
   * @returns 路径点数组，如果找不到则返回空数组
   */
  findPath(
    start: Vector3,
    end: Vector3,
    options: PathfindingOptions = {}
  ): Vector3[] {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    
    // 转换为网格坐标
    const startCell = this.map.worldToCell(start)
    const endCell = this.map.worldToCell(end)

    // 检查目标是否可通行
    if (!this.isPassable(endCell.x, endCell.y, opts.movementType!)) {
      // 尝试寻找附近可通行的点
      const alternative = this.findNearestPassable(endCell.x, endCell.y, opts.movementType!)
      if (!alternative) return []
      return this.findPath(start, { x: alternative.x, y: 0, z: alternative.y }, options)
    }

    // A*算法
    const openSet: PathNode[] = []
    const closedSet: Set<string> = new Set()
    
    const startNode: PathNode = {
      x: startCell.x,
      y: startCell.y,
      g: 0,
      h: this.heuristic(startCell.x, startCell.y, endCell.x, endCell.y),
      f: 0
    }
    startNode.f = startNode.g + startNode.h
    openSet.push(startNode)

    let iterations = 0

    while (openSet.length > 0 && iterations < opts.maxIterations!) {
      iterations++

      // 找到f值最小的节点
      let currentIndex = 0
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i
        }
      }

      const current = openSet[currentIndex]

      // 到达目标
      if (current.x === endCell.x && current.y === endCell.y) {
        return this.reconstructPath(current)
      }

      // 移动到关闭集合
      openSet.splice(currentIndex, 1)
      closedSet.add(`${current.x},${current.y}`)

      // 检查邻居
      const neighbors = this.getNeighbors(current, opts)

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`
        
        if (closedSet.has(key)) continue
        
        if (!this.isPassable(neighbor.x, neighbor.y, opts.movementType!)) continue

        const gScore = current.g + this.getMovementCost(current, neighbor, opts)

        const existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y)

        if (!existingNode) {
          // 新节点
          const newNode: PathNode = {
            x: neighbor.x,
            y: neighbor.y,
            g: gScore,
            h: this.heuristic(neighbor.x, neighbor.y, endCell.x, endCell.y),
            f: 0,
            parent: current
          }
          newNode.f = newNode.g + newNode.h
          openSet.push(newNode)
        } else if (gScore < existingNode.g) {
          // 找到更优路径
          existingNode.g = gScore
          existingNode.f = gScore + existingNode.h
          existingNode.parent = current
        }
      }
    }

    // 未找到路径
    return []
  }

  /**
   * 检查位置是否可通行
   */
  isPassable(x: number, y: number, movementType: string): boolean {
    const cell = this.map.getCell(x, y)
    if (!cell) return false

    // 飞行单位可以通过任何地形
    if (movementType === 'fly') return true

    // 检查是否被阻挡
    if (this.map.isCellBlocked(x, y)) return false

    // 悬浮单位可以通过水但不能通过岩石/树木
    if (movementType === 'hover') {
      return cell.terrainType !== 'Rock' && cell.terrainType !== 'Tree'
    }

    // 步兵不能通过水
    if (movementType === 'foot') {
      return cell.terrainType !== 'Water'
    }

    // 载具默认通行性
    return cell.passable
  }

  /**
   * 寻找最近的可通行位置
   */
  findNearestPassable(x: number, y: number, movementType: string): { x: number; y: number } | null {
    // 螺旋搜索
    const maxRadius = 10
    
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // 只检查外圈
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
          
          const nx = x + dx
          const ny = y + dy
          
          if (this.isPassable(nx, ny, movementType)) {
            return { x: nx, y: ny }
          }
        }
      }
    }
    
    return null
  }

  /**
   * 启发式函数（曼哈顿距离）
   */
  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2)
  }

  /**
   * 获取邻居节点
   */
  private getNeighbors(node: PathNode, options: PathfindingOptions): { x: number; y: number }[] {
    const neighbors: { x: number; y: number }[] = []
    
    // 四方向
    neighbors.push({ x: node.x + 1, y: node.y })
    neighbors.push({ x: node.x - 1, y: node.y })
    neighbors.push({ x: node.x, y: node.y + 1 })
    neighbors.push({ x: node.x, y: node.y - 1 })

    // 对角线
    if (options.allowDiagonal) {
      neighbors.push({ x: node.x + 1, y: node.y + 1 })
      neighbors.push({ x: node.x + 1, y: node.y - 1 })
      neighbors.push({ x: node.x - 1, y: node.y + 1 })
      neighbors.push({ x: node.x - 1, y: node.y - 1 })
    }

    return neighbors
  }

  /**
   * 获取移动成本
   */
  private getMovementCost(from: PathNode, to: { x: number; y: number }, _options: PathfindingOptions): number {
    let cost = 1

    // 对角线移动成本更高
    if (from.x !== to.x && from.y !== to.y) {
      cost = 1.414 // √2
    }

    return cost
  }

  /**
   * 重建路径
   */
  private reconstructPath(endNode: PathNode): Vector3[] {
    const path: Vector3[] = []
    let current: PathNode | undefined = endNode

    while (current) {
      const worldPos = this.map.cellToWorld(current.x, current.y)
      path.unshift(worldPos)
      current = current.parent
    }

    return path
  }

  /**
   * 路径平滑（简化拐点）
   */
  smoothPath(path: Vector3[]): Vector3[] {
    if (path.length <= 2) return path

    const smoothed: Vector3[] = [path[0]]
    let lastDirection = this.getDirection(path[0], path[1])

    for (let i = 1; i < path.length - 1; i++) {
      const currentDirection = this.getDirection(path[i], path[i + 1])
      
      // 方向改变时保留点
      if (!this.isSameDirection(lastDirection, currentDirection)) {
        smoothed.push(path[i])
        lastDirection = currentDirection
      }
    }

    smoothed.push(path[path.length - 1])
    return smoothed
  }

  /**
   * 获取方向向量
   */
  private getDirection(from: Vector3, to: Vector3): { x: number; z: number } {
    const dx = to.x - from.x
    const dz = to.z - from.z
    const length = Math.sqrt(dx * dx + dz * dz)
    
    if (length === 0) return { x: 0, z: 0 }
    
    return {
      x: Math.round(dx / length),
      z: Math.round(dz / length)
    }
  }

  /**
   * 检查方向是否相同
   */
  private isSameDirection(a: { x: number; z: number }, b: { x: number; z: number }): boolean {
    return a.x === b.x && a.z === b.z
  }

  /**
   * 计算路径长度
   */
  calculatePathLength(path: Vector3[]): number {
    let length = 0
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x
      const dz = path[i].z - path[i - 1].z
      length += Math.sqrt(dx * dx + dz * dz)
    }
    return length
  }
}

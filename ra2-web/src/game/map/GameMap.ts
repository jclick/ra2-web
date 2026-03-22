import { TerrainType, MapCell, Vector3 } from '../types'
import { Unit } from '../objects/Unit'

/**
 * 游戏地图 - 管理地形、障碍物和可通行性
 */
export class GameMap {
  private width: number
  private height: number
  private cells: MapCell[][]
  
  // 地图名称
  name: string = ''
  
  //  Theater (主题) - temperate, snow, urban, desert
  theater: string = 'temperate'
  
  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.cells = []
    
    this.initializeCells()
  }
  
  /**
   * 初始化地图单元格
   */
  private initializeCells(): void {
    for (let x = 0; x < this.width; x++) {
      this.cells[x] = []
      for (let y = 0; y < this.height; y++) {
        this.cells[x][y] = {
          x,
          y,
          height: 0,
          terrainType: TerrainType.CLEAR,
          passable: true,
        }
      }
    }
  }
  
  /**
   * 生成测试地图
   */
  static generateTestMap(size: number = 50): GameMap {
    const map = new GameMap(size, size)
    
    // 添加一些随机障碍物
    for (let i = 0; i < size * size * 0.1; i++) {
      const x = Math.floor(Math.random() * size)
      const y = Math.floor(Math.random() * size)
      
      // 避开中心和角落（出生点）
      const isCenter = x > size * 0.4 && x < size * 0.6 && y > size * 0.4 && y < size * 0.6
      const isCorner = (x < 5 && y < 5) || (x > size - 5 && y > size - 5)
      
      if (!isCenter && !isCorner) {
        const rand = Math.random()
        if (rand < 0.3) {
          map.setTerrain(x, y, TerrainType.WATER, false)
        } else if (rand < 0.6) {
          map.setTerrain(x, y, TerrainType.ROCK, false)
        } else {
          map.setTerrain(x, y, TerrainType.TREE, false)
        }
      }
    }
    
    return map
  }
  
  /**
   * 获取单元格
   */
  getCell(x: number, y: number): MapCell | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null
    }
    return this.cells[x][y]
  }
  
  /**
   * 设置地形
   */
  setTerrain(x: number, y: number, type: TerrainType, passable?: boolean): void {
    const cell = this.getCell(x, y)
    if (!cell) return
    
    cell.terrainType = type
    
    // 自动设置可通行性
    if (passable === undefined) {
      switch (type) {
        case TerrainType.CLEAR:
        case TerrainType.ROAD:
          cell.passable = true
          break
        case TerrainType.WATER:
        case TerrainType.ROCK:
        case TerrainType.TREE:
          cell.passable = false
          break
        default:
          cell.passable = true
      }
    } else {
      cell.passable = passable
    }
  }
  
  /**
   * 设置单元格高度
   */
  setHeight(x: number, y: number, height: number): void {
    const cell = this.getCell(x, y)
    if (cell) {
      cell.height = height
    }
  }
  
  /**
   * 设置单元格上的对象
   */
  setObject(x: number, y: number, object: any | null): void {
    const cell = this.getCell(x, y)
    if (cell) {
      cell.object = object || undefined
    }
  }
  
  /**
   * 检查坐标是否有效
   */
  isValidCell(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }
  
  /**
   * 检查单元格是否被阻挡
   */
  isCellBlocked(x: number, y: number): boolean {
    const cell = this.getCell(x, y)
    return !cell || !cell.passable || cell.object !== undefined
  }
  
  /**
   * 检查单元格是否可通过（考虑单位类型）
   */
  isPassable(x: number, y: number, unit: Unit): boolean {
    const cell = this.getCell(x, y)
    if (!cell) return false
    
    // 检查是否有其他单位
    if (cell.object && cell.object !== unit) {
      return false
    }
    
    // 根据单位移动类型判断
    switch (unit.stats.movementType) {
      case 'fly':
        // 飞行单位无视地形
        return true
        
      case 'hover':
        // 悬浮单位可以通过水
        return cell.terrainType !== TerrainType.ROCK && 
               cell.terrainType !== TerrainType.TREE
               
      case 'foot':
        // 步兵不能通过水域
        return cell.terrainType !== TerrainType.WATER && 
               cell.passable
               
      case 'track':
      case 'wheel':
      default:
        // 载具按默认通行性
        return cell.passable
    }
  }
  
  /**
   * 世界坐标转单元格坐标
   */
  worldToCell(worldPos: Vector3): { x: number; y: number } {
    return {
      x: Math.floor(worldPos.x),
      y: Math.floor(worldPos.z)
    }
  }
  
  /**
   * 单元格坐标转世界坐标（中心点）
   */
  cellToWorld(x: number, y: number): Vector3 {
    return {
      x: x + 0.5,
      y: this.getCell(x, y)?.height || 0,
      z: y + 0.5
    }
  }
  
  /**
   * 获取地图宽度
   */
  getWidth(): number {
    return this.width
  }
  
  /**
   * 获取地图高度
   */
  getHeight(): number {
    return this.height
  }
  
  /**
   * 获取所有单元格
   */
  getAllCells(): MapCell[] {
    const cells: MapCell[] = []
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        cells.push(this.cells[x][y])
      }
    }
    return cells
  }
  
  /**
   * 清除所有对象引用
   */
  clearObjects(): void {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.cells[x][y].object = undefined
      }
    }
  }
  
  /**
   * 序列化为JSON
   */
  toJSON(): object {
    return {
      width: this.width,
      height: this.height,
      name: this.name,
      theater: this.theater,
      cells: this.cells.map(col => 
        col.map(cell => ({
          x: cell.x,
          y: cell.y,
          height: cell.height,
          terrainType: cell.terrainType,
          passable: cell.passable,
        }))
      )
    }
  }
  
  /**
   * 从JSON加载
   */
  static fromJSON(data: any): GameMap {
    const map = new GameMap(data.width, data.height)
    map.name = data.name || ''
    map.theater = data.theater || 'temperate'
    
    for (const col of data.cells) {
      for (const cellData of col) {
        map.setTerrain(cellData.x, cellData.y, cellData.terrainType, cellData.passable)
        map.setHeight(cellData.x, cellData.y, cellData.height)
      }
    }
    
    return map
  }
}

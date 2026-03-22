import * as THREE from 'three'
import { ResourceManager } from './gameRes/ResourceManager'
import { GameManager } from '../game/GameManager'
import { Unit } from '../game/objects/Unit'
import { Building } from '../game/buildings/BuildingSystem'
import { Vector3, Faction, GameMode } from '../game/types'

/**
 * 游戏引擎核心
 * 负责协调渲染、音频、输入等所有子系统
 */
export class GameEngine {
  private container: HTMLElement | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.OrthographicCamera | null = null
  // private resourceManager: ResourceManager
  private gameManager: GameManager | null = null
  
  // 渲染相关
  private unitMeshes: Map<string, THREE.Group> = new Map()
  private buildingMeshes: Map<string, THREE.Mesh> = new Map()
  private selectionIndicators: Map<string, THREE.Mesh> = new Map()
  private mapMesh: THREE.Group | null = null
  
  // 状态
  private isRunning = false
  private isPaused = false
  private animationId: number | null = null
  private lastTime = 0
  
  // 相机控制
  private cameraTarget = new THREE.Vector3(25, 0, 25)
  private cameraZoom = 50
  private minZoom = 20
  private maxZoom = 100
  
  // 输入状态
  private isDragging = false
  private dragStart: { x: number; y: number } | null = null
  // selectionBox: THREE.Mesh | null = null
  
  // 建筑放置模式
  private isPlacingBuilding = false
  private onBuildingPlaced: ((position: Vector3) => void) | null = null
  private placementPreview: THREE.Mesh | null = null

  constructor(_resourceManager: ResourceManager) {
    // this.resourceManager = resourceManager
  }

  /**
   * 初始化游戏引擎
   */
  async initialize(): Promise<void> {
    // 初始化游戏管理器
    this.gameManager = new GameManager({
      mapName: 'TestMap',
      maxPlayers: 2,
      startingUnits: true,
      crates: false,
      superWeapons: false,
      gameMode: GameMode.STANDARD,
    })
    
    // 设置回调
    this.gameManager.setCallbacks({
      onUnitCreated: (unit) => this.onUnitCreated(unit),
      onUnitDestroyed: (unit) => this.onUnitDestroyed(unit),
      onBuildingCreated: (building) => this.onBuildingCreated(building),
      onBuildingDestroyed: (building) => this.onBuildingDestroyed(building),
      onSelectionChanged: (units) => this.onSelectionChanged(units),
    })
    
    this.gameManager.initialize()
    
    // 初始化Three.js
    this.initThreeJS()
    
    // 创建地图
    this.createMap()
    
    // 创建初始建筑
    this.createInitialBuildings()
    
    // 创建初始单位
    this.createInitialUnits()
    
    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize)
  }
  
  /**
   * 初始化Three.js
   */
  private initThreeJS(): void {
    // 检查 WebGL 支持
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      throw new Error('WebGL 不支持，无法初始化 3D 渲染器')
    }

    // 场景
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)
    
    // 等距相机
    const aspect = window.innerWidth / window.innerHeight
    this.camera = new THREE.OrthographicCamera(
      -this.cameraZoom * aspect,
      this.cameraZoom * aspect,
      this.cameraZoom,
      -this.cameraZoom,
      0.1,
      1000
    )
    this.updateCameraPosition()
    
    // 渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    
    // 光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(50, 100, 50)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    this.scene.add(dirLight)
  }
  
  /**
   * 更新相机位置和视锥体（用于正交相机的缩放）
   */
  private updateCameraPosition(): void {
    if (!this.camera) return
    
    // 正交相机的缩放通过调整视锥体大小实现
    const aspect = window.innerWidth / window.innerHeight
    this.camera.left = -this.cameraZoom * aspect
    this.camera.right = this.cameraZoom * aspect
    this.camera.top = this.cameraZoom
    this.camera.bottom = -this.cameraZoom
    
    // 保持相机位置相对于目标点的偏移
    const offset = this.cameraZoom * 0.8 // 调整视角高度
    this.camera.position.set(
      this.cameraTarget.x + offset,
      this.cameraTarget.y + offset,
      this.cameraTarget.z + offset
    )
    this.camera.lookAt(this.cameraTarget)
    this.camera.updateProjectionMatrix()
    
    console.log(`[Engine] Camera zoom: ${this.cameraZoom.toFixed(1)}, pos: ${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)}`)
  }
  
  /**
   * 创建地图
   */
  private createMap(): void {
    if (!this.scene || !this.gameManager) {
      console.warn('[Engine] Cannot create map: scene or gameManager is null')
      return
    }
    
    console.log('[Engine] Creating map...')
    
    this.mapMesh = new THREE.Group()
    
    const map = this.gameManager.map
    const cellSize = 1
    
    console.log(`[Engine] Map size: ${map.getWidth()}x${map.getHeight()}`)
    
    // 创建地面
    let tileCount = 0
    for (let x = 0; x < map.getWidth(); x++) {
      for (let y = 0; y < map.getHeight(); y++) {
        const cell = map.getCell(x, y)
        if (!cell) continue
        
        let color = 0x228B22 // 默认草地
        
        switch (cell.terrainType) {
          case 'Water':
            color = 0x006994
            break
          case 'Rock':
            color = 0x808080
            break
          case 'Tree':
            color = 0x0d5c0d
            break
          case 'Road':
            color = 0x696969
            break
        }
        
        const geometry = new THREE.BoxGeometry(cellSize, 0.5, cellSize)
        const material = new THREE.MeshLambertMaterial({ color })
        const mesh = new THREE.Mesh(geometry, material)
        
        mesh.position.set(x, 0, y)
        mesh.receiveShadow = true
        
        this.mapMesh.add(mesh)
        tileCount++
      }
    }
    
    console.log(`[Engine] Created ${tileCount} map tiles`)
    
    // 添加网格线
    const gridHelper = new THREE.GridHelper(map.getWidth(), map.getWidth(), 0x444444, 0x333333)
    gridHelper.position.set(map.getWidth() / 2 - 0.5, 0.01, map.getHeight() / 2 - 0.5)
    this.mapMesh.add(gridHelper)
    
    this.scene.add(this.mapMesh)
    console.log('[Engine] Map added to scene')
  }
  
  /**
   * 创建初始单位
   */
  private createInitialUnits(): void {
    if (!this.scene || !this.gameManager) {
      console.warn('[Engine] Cannot create units: scene or gameManager is null')
      return
    }
    
    const units = this.gameManager.getAllUnits()
    console.log(`[Engine] Creating ${units.length} initial units`)
    
    for (const unit of units) {
      this.createUnitMesh(unit)
    }
  }
  
  /**
   * 创建单位网格
   */
  private createUnitMesh(unit: Unit): void {
    if (!this.scene) return
    
    const group = new THREE.Group()
    
    // 根据阵营选择颜色
    const color = unit.faction === Faction.ALLIES ? 0x0066CC : 0xCC0000
    
    // 创建单位主体
    let geometry: THREE.BufferGeometry
    let scale = 1
    
    switch (unit.type) {
      case 'Infantry':
        geometry = new THREE.CapsuleGeometry(0.2, 0.6, 4, 8)
        scale = 0.5
        break
      case 'Aircraft':
        geometry = new THREE.ConeGeometry(0.5, 1.5, 8)
        geometry.rotateX(Math.PI / 2)
        scale = 0.8
        break
      default: // Vehicle
        geometry = new THREE.BoxGeometry(0.8, 0.5, 0.8)
        scale = 1
    }
    
    const material = new THREE.MeshLambertMaterial({ color })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.position.y = 0.5 * scale
    
    group.add(mesh)
    
    // 添加选择指示器（默认隐藏）
    const ringGeometry = new THREE.RingGeometry(0.5, 0.6, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.1
    
    group.add(ring)
    this.selectionIndicators.set(unit.id, ring)
    
    // 设置位置
    group.position.set(unit.position.x, 0, unit.position.z)
    
    this.scene.add(group)
    this.unitMeshes.set(unit.id, group)
  }
  
  /**
   * 更新单位渲染
   */
  private updateUnitRendering(unit: Unit): void {
    const mesh = this.unitMeshes.get(unit.id)
    if (!mesh) return
    
    // 更新位置（插值）
    mesh.position.x = unit.renderPosition.x
    mesh.position.z = unit.renderPosition.z
    mesh.position.y = unit.renderPosition.y
    
    // 更新旋转
    mesh.rotation.y = (unit.renderRotation * Math.PI) / 180
    
    // 更新选择指示器
    const indicator = this.selectionIndicators.get(unit.id)
    if (indicator) {
      const material = indicator.material as THREE.MeshBasicMaterial
      material.opacity = unit.selected ? 0.8 : 0
    }
  }
  
  /**
   * 单位创建回调
   */
  private onUnitCreated(unit: Unit): void {
    this.createUnitMesh(unit)
  }
  
  /**
   * 单位销毁回调
   */
  private onUnitDestroyed(unit: Unit): void {
    const mesh = this.unitMeshes.get(unit.id)
    if (mesh && this.scene) {
      this.scene.remove(mesh)
    }
    this.unitMeshes.delete(unit.id)
    this.selectionIndicators.delete(unit.id)
  }
  
  /**
   * 选择变化回调
   */
  private onSelectionChanged(units: Unit[]): void {
    // 选择变化时的额外处理
    console.log(`选中 ${units.length} 个单位`)
  }

  /**
   * 创建初始建筑
   */
  private createInitialBuildings(): void {
    if (!this.scene || !this.gameManager) {
      console.warn('[Engine] Cannot create buildings: scene or gameManager is null')
      return
    }

    const buildings = this.gameManager.getAllBuildings()
    console.log(`[Engine] Creating ${buildings.length} initial buildings`)

    for (const building of buildings) {
      this.createBuildingMesh(building)
    }
  }

  /**
   * 创建建筑网格
   */
  private createBuildingMesh(building: Building): void {
    if (!this.scene) return

    // 根据建筑类型选择颜色和大小
    let color = 0x808080
    let width = 2
    let height = 1.5
    let depth = 2

    switch (building.buildingId) {
      case 'GAPOWR':
      case 'NAPOWR':
        color = 0xffaa00 // 橙色 - 电厂
        height = 1.5
        break
      case 'GAREFN':
      case 'NAREFN':
        color = 0x00aaff // 蓝色 - 精炼厂
        width = 3
        depth = 3
        height = 1.2
        break
      case 'GAPILE':
      case 'NAHAND':
        color = 0x00ff00 // 绿色 - 兵营
        width = 2.5
        depth = 2.5
        height = 1.8
        break
      case 'GAWEAP':
      case 'NAWEAP':
        color = 0xff0000 // 红色 - 战车工厂
        width = 4
        depth = 3
        height = 2
        break
      case 'GACNST':
      case 'NACNST':
        color = 0xffff00 // 黄色 - 基地
        width = 3
        depth = 3
        height = 2.5
        break
    }

    // 根据阵营调整颜色
    if (building.faction === Faction.ALLIES) {
      color = 0x0066CC // 盟军蓝色
    } else if (building.faction === Faction.SOVIET) {
      color = 0xCC0000 // 苏联红色
    }

    const geometry = new THREE.BoxGeometry(width, height, depth)
    const material = new THREE.MeshLambertMaterial({ color })
    const mesh = new THREE.Mesh(geometry, material)

    mesh.position.set(building.position.x, height / 2, building.position.z)
    mesh.castShadow = true
    mesh.receiveShadow = true

    this.scene.add(mesh)
    this.buildingMeshes.set(building.id, mesh)

    console.log(`[Engine] Created building mesh: ${building.buildingId} at (${building.position.x}, ${building.position.z})`)
  }

  /**
   * 建筑创建回调
   */
  private onBuildingCreated(building: Building): void {
    this.createBuildingMesh(building)
  }

  /**
   * 建筑销毁回调
   */
  private onBuildingDestroyed(building: Building): void {
    const mesh = this.buildingMeshes.get(building.id)
    if (mesh && this.scene) {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
    this.buildingMeshes.delete(building.id)
  }

  /**
   * 附加到DOM元素
   */
  attachTo(container: HTMLElement): void {
    this.container = container
    if (this.renderer) {
      const canvas = this.renderer.domElement
      
      // 设置canvas样式确保正确显示
      canvas.style.display = 'block'
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      
      container.appendChild(canvas)
      
      // 根据容器大小调整渲染器
      const width = container.clientWidth
      const height = container.clientHeight
      
      console.log(`[Engine] Container dimensions: ${width}x${height}`)
      
      if (width > 0 && height > 0) {
        this.renderer.setSize(width, height, false) // false = don't update canvas style
        
        // 更新相机比例
        if (this.camera) {
          const aspect = width / height
          this.camera.left = -this.cameraZoom * aspect
          this.camera.right = this.cameraZoom * aspect
          this.camera.top = this.cameraZoom
          this.camera.bottom = -this.cameraZoom
          this.camera.updateProjectionMatrix()
        }
        
        console.log(`[Engine] Renderer resized to: ${width}x${height}`)
      } else {
        console.warn('[Engine] Container has zero size, using default dimensions')
      }
    }
    
    // 设置输入事件
    this.setupInputEvents()
  }
  
  /**
   * 设置输入事件
   */
  private setupInputEvents(): void {
    if (!this.renderer) {
      console.warn('[Engine] Cannot setup input events: renderer is null')
      return
    }
    
    const canvas = this.renderer.domElement
    
    console.log('[Engine] Setting up input events on canvas:', canvas)
    
    // 确保 canvas 可以获得焦点
    canvas.tabIndex = 0
    canvas.style.outline = 'none'
    
    canvas.addEventListener('mousedown', this.onMouseDown)
    canvas.addEventListener('mousemove', this.onMouseMove)
    canvas.addEventListener('mouseup', this.onMouseUp)
    canvas.addEventListener('wheel', this.onWheel, { passive: false })
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    
    // 添加窗口级别的滚轮事件作为后备
    window.addEventListener('wheel', (e) => {
      // 检查事件是否在 canvas 区域内
      if (this.container && this.container.contains(e.target as Node)) {
        this.onWheel(e)
      }
    }, { passive: false })
    
    console.log('[Engine] Input events setup complete')
  }
  
  /**
   * 鼠标按下
   */
  private onMouseDown = (e: MouseEvent): void => {
    console.log('[Engine] Mouse down:', e.button, 'at', e.clientX, e.clientY)
    
    if (!this.gameManager) {
      console.warn('[Engine] No gameManager')
      return
    }
    
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    console.log('[Engine] Mouse position in canvas:', x, y)
    
    const worldPos = this.screenToWorld(x, y)
    console.log('[Engine] World position:', worldPos)
    
    if (e.button === 0) {
      // 检查是否在建筑放置模式
      if (this.isPlacingBuilding) {
        this.completeBuildingPlacement(worldPos)
        return
      }
      
      // 左键 - 选择
      this.isDragging = true
      this.dragStart = { x, y }
      
      // 检查是否点击了单位
      const clickedUnit = this.gameManager.getUnitAt(worldPos, 1)
      
      if (e.ctrlKey) {
        // Ctrl+点击 - 添加/移除选择
        if (clickedUnit) {
          if (clickedUnit.selected) {
            this.gameManager.removeFromSelection(clickedUnit)
          } else {
            this.gameManager.addToSelection(clickedUnit)
          }
        }
      } else {
        // 普通点击
        if (clickedUnit) {
          this.gameManager.selectUnit(clickedUnit)
        } else {
          // 点击空地 - 开始框选
          this.gameManager.clearSelection()
        }
      }
    } else if (e.button === 2) {
      // 右键 - 移动/攻击 或 取消建筑放置
      if (this.isPlacingBuilding) {
        this.cancelBuildingPlacement()
        return
      }
      
      if (this.gameManager.getSelectedUnits().length > 0) {
        const targetUnit = this.gameManager.getUnitAt(worldPos, 1)
        
        if (targetUnit && targetUnit.faction !== this.gameManager.getPlayer('player1')?.faction) {
          // 攻击敌人
          this.gameManager.attackTarget(targetUnit)
        } else {
          // 移动
          this.gameManager.moveSelectedUnits(worldPos)
        }
      }
    }
  }
  
  /**
   * 鼠标移动
   */
  private onMouseMove = (e: MouseEvent): void => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const worldPos = this.screenToWorld(x, y)
    
    // 如果在建筑放置模式，更新预览位置
    if (this.isPlacingBuilding) {
      this.updatePlacementPreview(worldPos)
      return
    }
    
    if (!this.isDragging || !this.dragStart) return
    
    // 拖拽距离足够大才开始框选
    const dx = x - this.dragStart.x
    const dy = y - this.dragStart.y
    
    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      // 显示选择框
      this.updateSelectionBox(this.dragStart.x, this.dragStart.y, x, y)
    }
  }
  
  /**
   * 鼠标释放
   */
  private onMouseUp = (e: MouseEvent): void => {
    if (!this.gameManager || !this.isDragging || !this.dragStart) return
    
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const dx = x - this.dragStart.x
    const dy = y - this.dragStart.y
    
    // 如果拖拽距离足够大，执行框选
    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      const startWorld = this.screenToWorld(this.dragStart.x, this.dragStart.y)
      const endWorld = this.screenToWorld(x, y)
      
      this.gameManager.selectInArea(startWorld, endWorld, 'player1')
    }
    
    this.isDragging = false
    this.dragStart = null
    this.hideSelectionBox()
  }
  
  /**
   * 滚轮缩放
   */
  private onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    
    console.log('[Engine] Wheel event:', e.deltaY, 'current zoom:', this.cameraZoom)
    
    const delta = e.deltaY > 0 ? 1.1 : 0.9
    this.cameraZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.cameraZoom * delta))
    
    console.log('[Engine] New zoom:', this.cameraZoom)
    
    this.updateCameraPosition()
  }
  
  /**
   * 屏幕坐标转世界坐标
   */
  private screenToWorld(screenX: number, screenY: number): Vector3 {
    if (!this.camera || !this.container) return { x: 0, y: 0, z: 0 }
    
    const rect = this.container.getBoundingClientRect()
    const ndcX = (screenX / rect.width) * 2 - 1
    const ndcY = -(screenY / rect.height) * 2 + 1
    
    const vector = new THREE.Vector3(ndcX, ndcY, 0.5)
    vector.unproject(this.camera)
    
    const dir = vector.sub(this.camera.position).normalize()
    const distance = -this.camera.position.y / dir.y
    
    const pos = this.camera.position.clone().add(dir.multiplyScalar(distance))
    
    return {
      x: pos.x,
      y: 0,
      z: pos.z,
    }
  }
  
  /**
   * 更新选择框
   */
  private updateSelectionBox(_x1: number, _y1: number, _x2: number, _y2: number): void {
    // 简化的选择框显示
    // 实际项目中可以添加可视化选择框
  }
  
  /**
   * 隐藏选择框
   */
  private hideSelectionBox(): void {
    // 隐藏选择框
  }

  /**
   * 开始游戏循环
   */
  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTime = performance.now()
    console.log('[Engine] Starting game loop...')
    this.gameLoop()
  }

  /**
   * 停止游戏循环
   */
  stop(): void {
    this.isRunning = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * 游戏主循环
   */
  private gameLoop = (): void => {
    if (!this.isRunning) return
    
    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime
    
    // 更新游戏逻辑
    if (this.gameManager && !this.isPaused) {
      this.gameManager.update(deltaTime)
    }
    
    // 更新单位渲染
    for (const unit of this.gameManager?.getAllUnits() || []) {
      this.updateUnitRendering(unit)
    }
    
    // 渲染
    this.render()

    this.animationId = requestAnimationFrame(this.gameLoop)
  }

  /**
   * 渲染场景
   */
  private render(): void {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera)
    }
  }

  /**
   * 处理窗口大小变化
   */
  private handleResize = (): void => {
    if (!this.renderer || !this.camera) return

    const aspect = window.innerWidth / window.innerHeight
    
    this.camera.left = -this.cameraZoom * aspect
    this.camera.right = this.cameraZoom * aspect
    this.camera.top = this.cameraZoom
    this.camera.bottom = -this.cameraZoom
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.handleResize)
    
    // 移除输入事件
    if (this.renderer) {
      const canvas = this.renderer.domElement
      canvas.removeEventListener('mousedown', this.onMouseDown)
      canvas.removeEventListener('mousemove', this.onMouseMove)
      canvas.removeEventListener('mouseup', this.onMouseUp)
      canvas.removeEventListener('wheel', this.onWheel)
    }

    if (this.renderer) {
      this.renderer.dispose()
      if (this.container && this.renderer.domElement.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement)
      }
    }

    this.scene = null
    this.camera = null
    this.renderer = null
    this.container = null
  }
  
  /**
   * 暂停游戏
   */
  pause(): void {
    this.isPaused = true
    this.gameManager?.pause()
  }
  
  /**
   * 恢复游戏
   */
  resume(): void {
    this.isPaused = false
    this.gameManager?.resume()
  }

  /**
   * 获取游戏管理器
   */
  getGameManager(): GameManager | null {
    return this.gameManager
  }

  /**
   * 设置游戏管理器（用于外部传入）
   */
  setGameManager(gameManager: GameManager): void {
    // 如果是同一个 GameManager，只需更新回调，但仍需确保场景已创建
    if (this.gameManager === gameManager) {
      console.log('[Engine] Same GameManager, updating callbacks and ensuring scene')
      this.gameManager.setCallbacks({
        onUnitCreated: (unit) => this.onUnitCreated(unit),
        onUnitDestroyed: (unit) => this.onUnitDestroyed(unit),
        onSelectionChanged: (units) => this.onSelectionChanged(units),
      })
      
      // 如果场景已准备好但地图还没创建，创建它们
      if (this.scene && !this.mapMesh) {
        console.log('[Engine] Scene ready but no map, creating map and units')
        this.createMap()
        this.createInitialUnits()
      }
      return
    }
    
    this.gameManager = gameManager
    
    // 设置回调
    this.gameManager.setCallbacks({
      onUnitCreated: (unit) => this.onUnitCreated(unit),
      onUnitDestroyed: (unit) => this.onUnitDestroyed(unit),
      onSelectionChanged: (units) => this.onSelectionChanged(units),
    })
    
    // 重新创建地图和单位
    if (this.scene) {
      // 清除旧的
      this.unitMeshes.forEach((mesh) => this.scene!.remove(mesh))
      this.unitMeshes.clear()
      this.selectionIndicators.clear()
      
      if (this.mapMesh) {
        this.scene.remove(this.mapMesh)
        this.mapMesh = null
      }
      
      // 创建新的
      this.createMap()
      this.createInitialUnits()
    }
  }

  /**
   * 移动相机
   */
  moveCamera(x: number, y: number, z: number): void {
    this.cameraTarget.set(x, y, z)
    this.updateCameraPosition()
  }

  /**
   * 开始建筑放置模式
   */
  startBuildingPlacement(buildingId: string, onPlace: (position: Vector3) => void): void {
    console.log('[Engine] 进入建筑放置模式:', buildingId)
    
    this.isPlacingBuilding = true
    this.onBuildingPlaced = onPlace
    
    // 创建放置预览网格
    this.createPlacementPreview()
    
    // 改变鼠标样式
    if (this.renderer) {
      this.renderer.domElement.style.cursor = 'crosshair'
    }
  }

  /**
   * 创建建筑放置预览
   */
  private createPlacementPreview(): void {
    if (!this.scene) return
    
    // 移除旧的预览
    if (this.placementPreview) {
      this.scene.remove(this.placementPreview)
      this.placementPreview.geometry.dispose()
      ;(this.placementPreview.material as THREE.Material).dispose()
      this.placementPreview = null
    }
    
    // 创建预览网格（半透明绿色方块）
    const geometry = new THREE.BoxGeometry(2, 1, 2)
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
    })
    this.placementPreview = new THREE.Mesh(geometry, material)
    this.placementPreview.visible = false
    this.scene.add(this.placementPreview)
  }

  /**
   * 更新预览位置
   */
  private updatePlacementPreview(worldPos: Vector3): void {
    if (!this.placementPreview) return
    
    this.placementPreview.visible = true
    this.placementPreview.position.set(worldPos.x, 0.5, worldPos.z)
    
    // 检查位置是否可建造（简化：只检查是否在地图范围内）
    const isValid = this.isValidPlacementPosition(worldPos)
    const material = this.placementPreview.material as THREE.MeshBasicMaterial
    material.color.setHex(isValid ? 0x00ff00 : 0xff0000)
  }

  /**
   * 检查位置是否可建造
   */
  private isValidPlacementPosition(pos: Vector3): boolean {
    if (!this.gameManager) return false
    
    const map = this.gameManager.map
    const x = Math.floor(pos.x)
    const z = Math.floor(pos.z)
    
    // 检查地图边界
    if (x < 0 || x >= map.getWidth() || z < 0 || z >= map.getHeight()) {
      return false
    }
    
    // 检查地形是否可建造
    const cell = map.getCell(x, z)
    if (!cell || cell.terrainType === 'Water') {
      return false
    }
    
    return true
  }

  /**
   * 取消建筑放置模式
   */
  private cancelBuildingPlacement(): void {
    console.log('[Engine] 取消建筑放置模式')
    
    this.isPlacingBuilding = false
    this.onBuildingPlaced = null
    
    if (this.placementPreview) {
      this.placementPreview.visible = false
    }
    
    if (this.renderer) {
      this.renderer.domElement.style.cursor = 'default'
    }
  }

  /**
   * 完成建筑放置
   */
  private completeBuildingPlacement(worldPos: Vector3): void {
    if (!this.isValidPlacementPosition(worldPos)) {
      console.log('[Engine] 位置无效，无法放置建筑')
      return
    }
    
    console.log('[Engine] 放置建筑于位置:', worldPos)
    
    if (this.onBuildingPlaced) {
      this.onBuildingPlaced(worldPos)
    }
    
    this.cancelBuildingPlacement()
  }

  /**
   * 开始路径点设置
   */
  startWaypointPlacement(onPlace: (position: Vector3) => void): void {
    console.log('开始设置路径点')
    onPlace({
      x: Math.floor(this.cameraTarget.x),
      y: 0,
      z: Math.floor(this.cameraTarget.z),
    })
  }
}

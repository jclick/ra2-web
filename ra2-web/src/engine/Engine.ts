import * as THREE from 'three'
import { ResourceManager } from './gameRes/ResourceManager'
import { GameManager } from '../game/GameManager'
import { Unit } from '../game/objects/Unit'
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
      onSelectionChanged: (units) => this.onSelectionChanged(units),
    })
    
    this.gameManager.initialize()
    
    // 初始化Three.js
    this.initThreeJS()
    
    // 创建地图
    this.createMap()
    
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
   * 更新相机位置
   */
  private updateCameraPosition(): void {
    if (!this.camera) return
    
    const offset = this.cameraZoom
    this.camera.position.set(
      this.cameraTarget.x + offset,
      this.cameraTarget.y + offset,
      this.cameraTarget.z + offset
    )
    this.camera.lookAt(this.cameraTarget)
    this.camera.zoom = 1
    this.camera.updateProjectionMatrix()
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
    if (!this.scene || !this.gameManager) return
    
    for (const unit of this.gameManager.getAllUnits()) {
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
   * 附加到DOM元素
   */
  attachTo(container: HTMLElement): void {
    this.container = container
    if (this.renderer) {
      container.appendChild(this.renderer.domElement)
      
      // 根据容器大小调整渲染器
      const width = container.clientWidth
      const height = container.clientHeight
      this.renderer.setSize(width, height)
      
      // 更新相机比例
      if (this.camera) {
        const aspect = width / height
        this.camera.left = -this.cameraZoom * aspect
        this.camera.right = this.cameraZoom * aspect
        this.camera.top = this.cameraZoom
        this.camera.bottom = -this.cameraZoom
        this.camera.updateProjectionMatrix()
      }
      
      console.log(`[Engine] Attached to container: ${width}x${height}`)
    }
    
    // 设置输入事件
    this.setupInputEvents()
  }
  
  /**
   * 设置输入事件
   */
  private setupInputEvents(): void {
    if (!this.renderer) return
    
    const canvas = this.renderer.domElement
    
    canvas.addEventListener('mousedown', this.onMouseDown)
    canvas.addEventListener('mousemove', this.onMouseMove)
    canvas.addEventListener('mouseup', this.onMouseUp)
    canvas.addEventListener('wheel', this.onWheel)
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  }
  
  /**
   * 鼠标按下
   */
  private onMouseDown = (e: MouseEvent): void => {
    if (!this.gameManager) return
    
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const worldPos = this.screenToWorld(x, y)
    
    if (e.button === 0) {
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
      // 右键 - 移动/攻击
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
    if (!this.isDragging || !this.dragStart) return
    
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
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
    
    const delta = e.deltaY > 0 ? 1.1 : 0.9
    this.cameraZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.cameraZoom * delta))
    
    this.updateCameraPosition()
  }
  
  /**
   * 屏幕坐标转世界坐标
   */
  private screenToWorld(screenX: number, screenY: number): Vector3 {
    if (!this.camera) return { x: 0, y: 0, z: 0 }
    
    const ndcX = (screenX / window.innerWidth) * 2 - 1
    const ndcY = -(screenY / window.innerHeight) * 2 + 1
    
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
    // 简化的建筑放置 - 直接调用回调
    // 实际项目中应该显示建筑预览并等待玩家点击位置
    console.log('开始放置建筑:', buildingId)
    
    // 临时：在相机目标位置放置
    onPlace({
      x: Math.floor(this.cameraTarget.x),
      y: 0,
      z: Math.floor(this.cameraTarget.z),
    })
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

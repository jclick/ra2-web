/**
 * FogOfWarAdapter
 * 
 * 战争迷雾适配器
 * 桥接现有地图渲染与ECS迷雾系统
 */

import { World, Entity } from '../'
import { FogOfWarSystem } from '../systems/FogOfWarSystem'
import { FogOfWarComponent, FOG_OF_WAR_TYPE } from '../components/FogOfWarComponent'

/**
 * 迷雾渲染数据
 */
export interface FogRenderData {
  width: number
  height: number
  data: Uint8Array  // 0=hidden, 1=revealed, 2=visible
  version: number
}

/**
 * 战争迷雾适配器
 */
export class FogOfWarAdapter {
  private world: World
  private system: FogOfWarSystem
  private worldEntity: Entity

  // 迷雾纹理数据
  private fogTextureData: Map<string, FogRenderData> = new Map()

  constructor(world: World, mapWidth: number = 128, mapHeight: number = 128) {
    this.world = world
    this.system = new FogOfWarSystem(mapWidth, mapHeight)
    
    // 创建世界实体来存储全局迷雾
    this.worldEntity = world.createEntity('World')
    this.worldEntity.addComponent(new FogOfWarComponent())
    
    // 添加系统
    world.addSystem(this.system)

    // 监听迷雾更新
    world.events.on('fog_of_war:updated', (event: { playerId: string; version: number }) => {
      this.onFogUpdated(event.playerId)
    })
  }

  /**
   * 初始化玩家迷雾
   */
  initPlayerFog(playerId: string): void {
    this.system.initPlayerFog(playerId)
  }

  /**
   * 获取迷雾渲染数据
   */
  getFogRenderData(playerId: string): FogRenderData | null {
    const layer = this.system.getLayerData(playerId)
    if (!layer) return null

    // 检查缓存
    const cached = this.fogTextureData.get(playerId)
    if (cached?.version === layer.version) {
      return cached
    }

    // 生成新的渲染数据
    const data = new Uint8Array(layer.data)
    const renderData: FogRenderData = {
      width: layer.width,
      height: layer.height,
      data,
      version: layer.version
    }

    this.fogTextureData.set(playerId, renderData)
    return renderData
  }

  /**
   * 检查位置是否可见
   */
  isVisible(playerId: string, x: number, y: number): boolean {
    return this.system.isVisibleToPlayer(playerId, x, y)
  }

  /**
   * 检查实体是否可见
   */
  isEntityVisible(playerId: string, entity: Entity): boolean {
    return this.system.isEntityVisibleToPlayer(entity, playerId)
  }

  /**
   * 设置实体探测能力
   */
  setEntityDetection(entity: Entity, radius: number): void {
    const fog = entity.getComponent<FogOfWarComponent>(FOG_OF_WAR_TYPE)
    if (fog) {
      fog.detectsStealth = true
      fog.detectionRadius = radius
    } else {
      const newFog = new FogOfWarComponent(0, false, true)
      newFog.detectionRadius = radius
      entity.addComponent(newFog)
    }
  }

  /**
   * 设置实体隐形
   */
  setEntityStealth(entity: Entity, isStealth: boolean): void {
    // 这里需要与VisionComponent配合
    // 触发事件让VisionComponent更新
    this.world.events.emit('fog_of_war:stealth_changed', {
      entityId: entity.id,
      isStealth
    })
  }

  /**
   * 揭示地图（作弊/观战）
   */
  revealAll(playerId: string): void {
    this.system.revealAll(playerId)
  }

  /**
   * 隐藏地图
   */
  hideAll(playerId: string): void {
    this.system.hideAll(playerId)
  }

  /**
   * 迷雾更新回调
   */
  private onFogUpdated(_playerId: string): void {
    // 清除缓存，下次getFogRenderData会重新生成
    // 实际应用中这里可以触发纹理更新
  }

  /**
   * 更新迷雾纹理到WebGL
   */
  updateFogTexture(gl: WebGLRenderingContext, texture: WebGLTexture, playerId: string): void {
    const data = this.getFogRenderData(playerId)
    if (!data) return

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      data.width,
      data.height,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      data.data
    )
  }

  /**
   * 获取迷雾统计
   */
  getFogStats(playerId: string) {
    return this.system.getStats(playerId)
  }

  /**
   * 清理
   */
  dispose(): void {
    this.fogTextureData.clear()
    this.world.removeSystem(this.system)
  }
}

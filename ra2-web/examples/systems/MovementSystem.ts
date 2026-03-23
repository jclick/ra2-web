/**
 * 移动系统
 * 
 * 处理所有具有 Movement 和 Transform 组件的实体的移动逻辑
 */

import { System, SystemPriority } from '../core/System'
import { World } from '../core/World'
import { EventBus } from '../core/EventBus'
import { ComponentType, Movement, Transform, PathNode } from '../core/Component'
import { EntityId } from '../core/Entity'
import { PathfindingService } from '../services/PathfindingService'

export class MovementSystem extends System {
  private pathfinding: PathfindingService
  
  constructor(world: World, eventBus: EventBus, pathfinding: PathfindingService) {
    super(world, eventBus, SystemPriority.MOVEMENT)
    this.pathfinding = pathfinding
  }
  
  getRequiredComponents() {
    return [ComponentType.TRANSFORM, ComponentType.MOVEMENT]
  }
  
  update(deltaTime: number): void {
    const entities = this.getEntities()
    
    for (const entityId of entities) {
      const transform = this.getComponent<Transform>(entityId, ComponentType.TRANSFORM)!
      const movement = this.getComponent<Movement>(entityId, ComponentType.MOVEMENT)!
      
      // 没有移动目标
      if (!movement.targetPosition && movement.path.length === 0) {
        if (movement.isMoving) {
          movement.isMoving = false
          this.eventBus.emit('movement:completed', { entityId })
        }
        continue
      }
      
      // 需要计算新路径
      if (movement.path.length === 0 && movement.targetPosition) {
        this.calculatePath(entityId, transform, movement)
      }
      
      // 沿路径移动
      if (movement.path.length > 0) {
        this.followPath(entityId, transform, movement, deltaTime)
      }
    }
  }
  
  private calculatePath(
    entityId: EntityId,
    transform: Transform,
    movement: Movement
  ): void {
    const startX = Math.floor(transform.x)
    const startY = Math.floor(transform.z)
    const endX = Math.floor(movement.targetPosition!.x)
    const endY = Math.floor(movement.targetPosition!.z)
    
    // 已经在目标位置
    if (startX === endX && startY === endY) {
      movement.targetPosition = undefined
      return
    }
    
    const path = this.pathfinding.findPath(
      startX,
      startY,
      endX,
      endY,
      {
        movementType: movement.movementType,
        entityId
      }
    )
    
    if (path.length > 0) {
      movement.path = path
      movement.isMoving = true
      this.eventBus.emit('movement:started', {
        entityId,
        destination: { x: endX, z: endY }
      })
    } else {
      // 无法到达目标
      movement.targetPosition = undefined
      this.eventBus.emit('movement:blocked', {
        entityId,
        position: { x: transform.x, z: transform.z }
      })
    }
  }
  
  private followPath(
    entityId: EntityId,
    transform: Transform,
    movement: Movement,
    deltaTime: number
  ): void {
    const nextNode = movement.path[0]
    const targetX = nextNode.x + 0.5  // 格子中心
    const targetZ = nextNode.y + 0.5
    
    const dx = targetX - transform.x
    const dz = targetZ - transform.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    
    const moveDistance = movement.speed * (deltaTime / 1000)
    
    if (distance <= moveDistance) {
      // 到达路径点
      transform.x = targetX
      transform.z = targetZ
      movement.path.shift()
      
      if (movement.path.length === 0) {
        // 到达最终目标
        movement.targetPosition = undefined
        movement.isMoving = false
        this.eventBus.emit('movement:completed', { entityId })
      }
    } else {
      // 继续移动
      const normalizedDx = dx / distance
      const normalizedDz = dz / distance
      
      transform.x += normalizedDx * moveDistance
      transform.z += normalizedDz * moveDistance
      
      // 更新旋转
      const targetRotation = Math.atan2(normalizedDx, normalizedDz)
      this.updateRotation(transform, targetRotation, movement.turnRate, deltaTime)
    }
  }
  
  private updateRotation(
    transform: Transform,
    targetRotation: number,
    turnRate: number,
    deltaTime: number
  ): void {
    let diff = targetRotation - transform.rotation
    
    // 标准化到 -PI ~ PI
    while (diff > Math.PI) diff -= 2 * Math.PI
    while (diff < -Math.PI) diff += 2 * Math.PI
    
    const maxRotation = (turnRate * Math.PI / 180) * (deltaTime / 1000)
    
    if (Math.abs(diff) <= maxRotation) {
      transform.rotation = targetRotation
    } else {
      transform.rotation += Math.sign(diff) * maxRotation
    }
  }
  
  /**
   * 外部调用：设置移动目标
   */
  moveTo(entityId: EntityId, destination: { x: number; z: number }): boolean {
    const movement = this.world.getComponent<Movement>(entityId, ComponentType.MOVEMENT)
    if (!movement) return false
    
    movement.targetPosition = { x: destination.x, y: 0, z: destination.z }
    movement.path = [] // 清空旧路径，让系统重新计算
    
    return true
  }
  
  /**
   * 外部调用：停止移动
   */
  stop(entityId: EntityId): boolean {
    const movement = this.world.getComponent<Movement>(entityId, ComponentType.MOVEMENT)
    if (!movement) return false
    
    movement.targetPosition = undefined
    movement.path = []
    movement.isMoving = false
    
    return true
  }
}

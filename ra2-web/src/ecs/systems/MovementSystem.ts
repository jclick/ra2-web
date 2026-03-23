/**
 * MovementSystem
 * 
 * 处理所有带 MovementComponent 的实体的移动逻辑
 * 包括路径跟随、转向、插值平滑等
 */

import { EntitySystem, SystemPriority } from '../core/System'
import { Entity } from '../core/Entity'
import { MovementComponent, MovementState, MOVEMENT_TYPE } from '../components/MovementComponent'
import { TransformComponent, TRANSFORM_TYPE } from '../components/TransformComponent'
import { PathfindingService } from '../services/PathfindingService'
import { Vector3 } from '../../game/types'

export class MovementSystem extends EntitySystem {
  readonly priority = SystemPriority.HIGH

  // 寻路服务
  private pathfinding: PathfindingService | null = null

  // 移动统计（调试用）
  private stats = {
    entitiesMoving: 0,
    pathsCompleted: 0,
    pathsBlocked: 0
  }

  constructor(pathfinding?: PathfindingService) {
    super(MOVEMENT_TYPE, TRANSFORM_TYPE)
    if (pathfinding) {
      this.pathfinding = pathfinding
    }
  }

  /**
   * 设置寻路服务
   */
  setPathfindingService(pathfinding: PathfindingService): void {
    this.pathfinding = pathfinding
  }

  /**
   * 更新单个实体
   */
  protected updateEntity(entity: Entity, deltaTime: number): void {
    const movement = entity.getComponent<MovementComponent>(MOVEMENT_TYPE)!
    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)!

    // 更新渲染插值（始终进行，保证平滑）
    movement.updateRenderPosition(transform.position)
    movement.updateRenderRotation(transform.rotation.y * (180 / Math.PI))

    // 根据状态处理
    switch (movement.state) {
      case MovementState.MOVING:
        this.updateMoving(entity, movement, transform, deltaTime)
        break
      case MovementState.ROTATING:
        this.updateRotating(entity, movement, transform, deltaTime)
        break
      case MovementState.BLOCKED:
        // 尝试重新寻路
        this.tryRepath(entity, movement, transform)
        break
    }
  }

  /**
   * 更新移动状态
   */
  private updateMoving(
    _entity: Entity,
    movement: MovementComponent,
    transform: TransformComponent,
    deltaTime: number
  ): void {
    const target = movement.getCurrentTarget()
    if (!target) {
      movement.stop()
      this.stats.pathsCompleted++
      return
    }

    // 计算到目标的距离
    const dx = target.x - transform.position.x
    const dz = target.z - transform.position.z
    const distance = Math.sqrt(dx * dx + dz * dz)

    // 检查是否到达
    if (distance < movement.arrivalThreshold) {
      if (!movement.advancePath()) {
        // 路径完成
        this.stats.pathsCompleted++
      }
      return
    }

    // 计算目标角度（转换为弧度）
    const targetRotationRad = Math.atan2(dx, dz)
    const targetRotationDeg = targetRotationRad * (180 / Math.PI)
    const currentRotationDeg = transform.rotation.y * (180 / Math.PI)

    // 计算角度差
    const rotationDiff = this.normalizeAngle(targetRotationDeg - currentRotationDeg)

    // 如果需要转向
    if (Math.abs(rotationDiff) > movement.rotationThreshold) {
      movement.state = MovementState.ROTATING
      movement.targetRotation = targetRotationDeg
      this.updateRotating(_entity, movement, transform, deltaTime)
      return
    }

    // 朝向正确，开始移动
    const moveDistance = movement.speed * deltaTime
    const moveRatio = Math.min(moveDistance / distance, 1)

    transform.position.x += dx * moveRatio
    transform.position.z += dz * moveRatio

    // 保持Y坐标（地形高度）
    // TODO: 从地图获取实际高度
  }

  /**
   * 更新转向状态
   */
  private updateRotating(
    _entity: Entity,
    movement: MovementComponent,
    transform: TransformComponent,
    deltaTime: number
  ): void {
    if (movement.targetRotation === null) {
      movement.state = movement.isMoving ? MovementState.MOVING : MovementState.IDLE
      return
    }

    const targetDeg = movement.targetRotation
    const currentDeg = transform.rotation.y * (180 / Math.PI)
    const diff = this.normalizeAngle(targetDeg - currentDeg)

    // 计算最大转向
    const maxRotation = movement.turnRate * deltaTime

    if (Math.abs(diff) <= maxRotation) {
      // 转向完成
      transform.rotation.y = targetDeg * (Math.PI / 180)
      movement.targetRotation = null
      movement.state = movement.path.length > 0 || movement.targetPosition 
        ? MovementState.MOVING 
        : MovementState.IDLE
    } else {
      // 继续转向
      const newRotation = currentDeg + Math.sign(diff) * maxRotation
      transform.rotation.y = newRotation * (Math.PI / 180)
    }
  }

  /**
   * 尝试重新寻路
   */
  private tryRepath(
    _entity: Entity,
    movement: MovementComponent,
    transform: TransformComponent
  ): void {
    if (!this.pathfinding || !movement.targetPosition) {
      movement.stop()
      return
    }

    // 重新计算路径
    const path = this.pathfinding.findPath(
      transform.position,
      movement.targetPosition,
      { movementType: movement.movementType }
    )

    if (path.length > 0) {
      movement.setPath(path)
    } else {
      // 无法到达
      movement.stop()
      this.stats.pathsBlocked++
    }
  }

  /**
   * 命令实体移动到目标位置
   */
  moveTo(entity: Entity, destination: Vector3): boolean {
    const movement = entity.getComponent<MovementComponent>(MOVEMENT_TYPE)
    const transform = entity.getComponent<TransformComponent>(TRANSFORM_TYPE)

    if (!movement || !transform) return false

    // 如果目标就是当前位置，不做任何事
    const dx = destination.x - transform.position.x
    const dz = destination.z - transform.position.z
    if (Math.sqrt(dx * dx + dz * dz) < movement.arrivalThreshold) {
      return true
    }

    // 如果有寻路服务，计算路径
    if (this.pathfinding) {
      const path = this.pathfinding.findPath(
        transform.position,
        destination,
        { movementType: movement.movementType }
      )

      if (path.length > 0) {
        movement.setPath(path)
        return true
      }

      // 寻路失败，直接尝试直线移动
      movement.setDestination(destination)
      return false
    }

    // 没有寻路服务，直接设置目标
    movement.setDestination(destination)
    return true
  }

  /**
   * 命令实体停止移动
   */
  stop(entity: Entity): boolean {
    const movement = entity.getComponent<MovementComponent>(MOVEMENT_TYPE)
    if (!movement) return false

    movement.stop()
    return true
  }

  /**
   * 命令实体朝向指定方向
   */
  rotateTo(entity: Entity, rotation: number): boolean {
    const movement = entity.getComponent<MovementComponent>(MOVEMENT_TYPE)
    if (!movement) return false

    movement.targetRotation = rotation
    movement.state = MovementState.ROTATING
    return true
  }

  /**
   * 标准化角度到 -180 ~ 180
   */
  private normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360
    while (angle < -180) angle += 360
    return angle
  }

  /**
   * 获取移动统计
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      entitiesMoving: 0,
      pathsCompleted: 0,
      pathsBlocked: 0
    }
  }
}

/**
 * ECS 性能分析器
 *
 * 监控和优化ECS性能
 */

import { World } from '../core/World'

// 性能统计数据
export interface PerformanceStats {
  // 帧时间
  frameTime: number
  // 更新时间
  updateTime: number
  // 系统性能
  systemTimes: Map<string, number>
  // 实体数量
  entityCount: number
  // 组件数量
  componentCount: number
  // 事件数量
  eventCount: number
  // 内存估算（字节）
  estimatedMemory: number
}

// 性能分析器配置
export interface ProfilerConfig {
  // 是否启用
  enabled: boolean
  // 采样间隔（帧）
  sampleInterval: number
  // 最大历史记录数
  maxHistory: number
  // 慢帧阈值（ms）
  slowFrameThreshold: number
}

export class ECSProfiler {
  private world: World
  private config: ProfilerConfig
  private isRunning: boolean = false

  // 统计数据
  private stats: PerformanceStats = {
    frameTime: 0,
    updateTime: 0,
    systemTimes: new Map(),
    entityCount: 0,
    componentCount: 0,
    eventCount: 0,
    estimatedMemory: 0
  }

  // 历史数据
  private history: PerformanceStats[] = []

  // 慢帧记录
  private slowFrames: PerformanceStats[] = []

  // 每组件内存估算（字节）
  private readonly COMPONENT_MEMORY_ESTIMATE: Record<string, number> = {
    'transform': 64,
    'health': 48,
    'owner': 32,
    'vision': 40,
    'movement': 80,
    'weapon': 120,
    'combat': 64,
    'construction': 72,
    'economy': 56,
    'fog_of_war': 1024, // 迷雾数据较大
    'ai': 96,
    'super_weapon': 88,
    'effect': 64
  }

  constructor(world: World, config: Partial<ProfilerConfig> = {}) {
    this.world = world
    this.config = {
      enabled: true,
      sampleInterval: 1,
      maxHistory: 300, // 5秒@60fps
      slowFrameThreshold: 33, // 30fps
      ...config
    }
  }

  /**
   * 开始性能分析
   */
  start(): void {
    if (!this.config.enabled) return
    this.isRunning = true
  }

  /**
   * 停止性能分析
   */
  stop(): void {
    this.isRunning = false
  }

  /**
   * 记录一帧
   */
  recordFrame(deltaTime: number): void {
    if (!this.isRunning || !this.config.enabled) return

    this.stats.frameTime = deltaTime * 1000 // 转换为ms

    // 检查是否是慢帧
    if (this.stats.frameTime > this.config.slowFrameThreshold) {
      this.slowFrames.push({ ...this.stats })
      if (this.slowFrames.length > 100) {
        this.slowFrames.shift()
      }
    }

    // 添加到历史
    this.history.push({ ...this.stats })
    if (this.history.length > this.config.maxHistory) {
      this.history.shift()
    }

    // 重置统计
    this.stats.systemTimes.clear()
  }

  /**
   * 记录系统更新时间
   */
  recordSystemTime(systemName: string, timeMs: number): void {
    if (!this.isRunning) return
    this.stats.systemTimes.set(systemName, timeMs)
  }

  /**
   * 更新实体统计
   */
  updateEntityStats(): void {
    if (!this.isRunning) return

    let componentCount = 0
    let estimatedMemory = 0

    for (const entity of this.world.getAllEntities()) {
      const components = entity.getAllComponents()
      for (const type of components.keys()) {
        componentCount++
        estimatedMemory += this.COMPONENT_MEMORY_ESTIMATE[type] || 64
      }
    }

    this.stats.entityCount = this.world.getAllEntities().length
    this.stats.componentCount = componentCount
    this.stats.estimatedMemory = estimatedMemory
  }

  /**
   * 获取当前统计
   */
  getStats(): PerformanceStats {
    return { ...this.stats }
  }

  /**
   * 获取历史数据
   */
  getHistory(): PerformanceStats[] {
    return [...this.history]
  }

  /**
   * 获取慢帧记录
   */
  getSlowFrames(): PerformanceStats[] {
    return [...this.slowFrames]
  }

  /**
   * 获取平均帧时间
   */
  getAverageFrameTime(): number {
    if (this.history.length === 0) return 0
    const sum = this.history.reduce((acc, s) => acc + s.frameTime, 0)
    return sum / this.history.length
  }

  /**
   * 获取系统性能报告
   */
  getSystemReport(): Array<{ name: string; avgTime: number; maxTime: number }> {
    const systemStats = new Map<string, { total: number; max: number; count: number }>()

    for (const stats of this.history) {
      for (const [name, time] of stats.systemTimes) {
        const current = systemStats.get(name) || { total: 0, max: 0, count: 0 }
        current.total += time
        current.max = Math.max(current.max, time)
        current.count++
        systemStats.set(name, current)
      }
    }

    return Array.from(systemStats.entries())
      .map(([name, stats]) => ({
        name,
        avgTime: stats.total / stats.count,
        maxTime: stats.max
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
  }

  /**
   * 获取性能摘要
   */
  getSummary(): string {
    const avgFrameTime = this.getAverageFrameTime()
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0

    let summary = '\n📊 ECS 性能摘要\n'
    summary += '='.repeat(40) + '\n'
    summary += `实体数量: ${this.stats.entityCount}\n`
    summary += `组件数量: ${this.stats.componentCount}\n`
    summary += `平均帧时间: ${avgFrameTime.toFixed(2)}ms\n`
    summary += `平均FPS: ${fps.toFixed(1)}\n`
    summary += `估算内存: ${(this.stats.estimatedMemory / 1024).toFixed(2)} KB\n`
    summary += `慢帧数量: ${this.slowFrames.length}\n`

    // 系统性能
    const systemReport = this.getSystemReport()
    if (systemReport.length > 0) {
      summary += '\n系统性能（平均/最大 ms）:\n'
      for (const sys of systemReport.slice(0, 5)) {
        summary += `  ${sys.name}: ${sys.avgTime.toFixed(2)} / ${sys.maxTime.toFixed(2)}\n`
      }
    }

    return summary
  }

  /**
   * 生成优化建议
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = []
    const avgFrameTime = this.getAverageFrameTime()

    // 帧率建议
    if (avgFrameTime > 33) {
      suggestions.push('⚠️ 帧率低（<30fps），建议优化系统更新逻辑')
    } else if (avgFrameTime > 16) {
      suggestions.push('ℹ️ 帧率中等（30-60fps），仍有优化空间')
    }

    // 实体数量建议
    if (this.stats.entityCount > 1000) {
      suggestions.push('⚠️ 实体数量超过1000，考虑使用对象池减少创建/销毁')
    }

    // 组件数量建议
    const avgComponentsPerEntity = this.stats.entityCount > 0
      ? this.stats.componentCount / this.stats.entityCount
      : 0
    if (avgComponentsPerEntity > 8) {
      suggestions.push('ℹ️ 平均每实体组件数较高，检查是否有冗余组件')
    }

    // 内存建议
    if (this.stats.estimatedMemory > 10 * 1024 * 1024) {
      suggestions.push('⚠️ 估算内存超过10MB，考虑优化迷雾数据等大内存组件')
    }

    // 系统性能建议
    const systemReport = this.getSystemReport()
    if (systemReport.length > 0 && systemReport[0].avgTime > 5) {
      suggestions.push(`⚠️ ${systemReport[0].name} 系统耗时过长，需要优化`)
    }

    return suggestions
  }

  /**
   * 重置统计数据
   */
  reset(): void {
    this.history = []
    this.slowFrames = []
    this.stats = {
      frameTime: 0,
      updateTime: 0,
      systemTimes: new Map(),
      entityCount: 0,
      componentCount: 0,
      eventCount: 0,
      estimatedMemory: 0
    }
  }

  /**
   * 导出性能报告
   */
  exportReport(): object {
    return {
      timestamp: Date.now(),
      stats: this.getStats(),
      averageFrameTime: this.getAverageFrameTime(),
      systemReport: this.getSystemReport(),
      suggestions: this.getOptimizationSuggestions(),
      historySample: this.history.slice(-60) // 最近1秒
    }
  }
}

// 性能监控装饰器
export function ProfileSystem(target: any): any {
  const originalUpdate = target.prototype.update

  target.prototype.update = function(deltaTime: number): void {
    const startTime = performance.now()
    originalUpdate.call(this, deltaTime)
    const endTime = performance.now()

    // 如果world有profiler，记录时间
    if (this.world?.profiler) {
      this.world.profiler.recordSystemTime(
        this.constructor.name,
        endTime - startTime
      )
    }
  }

  return target
}

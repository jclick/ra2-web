/**
 * BehaviorTree 核心
 * 
 * 行为树基础节点和运行逻辑
 */

export type BTNodeStatus = 'success' | 'failure' | 'running'

export interface BTContext {
  entity: number  // 实体ID
  world: unknown  // World引用，由具体实现决定类型
  deltaTime: number
  memory: Map<string, unknown>  // 节点记忆
  [key: string]: unknown
}

export abstract class BTNode {
  name: string

  constructor(name: string) {
    this.name = name
  }

  abstract tick(context: BTContext): BTNodeStatus

  /**
   * 重置节点状态
   */
  reset(): void {
    // 子类可覆盖
  }
}

// ==================== 组合节点 ====================

export abstract class BTComposite extends BTNode {
  children: BTNode[]

  constructor(name: string, children: BTNode[] = []) {
    super(name)
    this.children = children
  }

  addChild(child: BTNode): void {
    this.children.push(child)
  }
}

/**
 * 顺序节点 - 子节点按顺序执行，一个失败则整体失败
 */
export class BTSequence extends BTComposite {
  private currentIndex: number = 0

  tick(context: BTContext): BTNodeStatus {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick(context)

      if (status === 'failure') {
        this.reset()
        return 'failure'
      }

      if (status === 'running') {
        return 'running'
      }

      this.currentIndex++
    }

    this.reset()
    return 'success'
  }

  reset(): void {
    super.reset()
    this.currentIndex = 0
    for (const child of this.children) {
      child.reset()
    }
  }
}

/**
 * 选择节点 - 子节点按顺序执行，一个成功则整体成功
 */
export class BTSelector extends BTComposite {
  private currentIndex: number = 0

  tick(context: BTContext): BTNodeStatus {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick(context)

      if (status === 'success') {
        this.reset()
        return 'success'
      }

      if (status === 'running') {
        return 'running'
      }

      this.currentIndex++
    }

    this.reset()
    return 'failure'
  }

  reset(): void {
    super.reset()
    this.currentIndex = 0
    for (const child of this.children) {
      child.reset()
    }
  }
}

/**
 * 并行节点 - 同时执行所有子节点
 */
export class BTParallel extends BTComposite {
  private successPolicy: 'all' | 'any'
  private failurePolicy: 'all' | 'any'

  constructor(
    name: string,
    children: BTNode[] = [],
    successPolicy: 'all' | 'any' = 'all',
    failurePolicy: 'all' | 'any' = 'any'
  ) {
    super(name, children)
    this.successPolicy = successPolicy
    this.failurePolicy = failurePolicy
  }

  tick(context: BTContext): BTNodeStatus {
    let successCount = 0
    let failureCount = 0
    let runningCount = 0

    for (const child of this.children) {
      const status = child.tick(context)

      if (status === 'success') successCount++
      else if (status === 'failure') failureCount++
      else runningCount++
    }

    // 检查成功条件
    if (this.successPolicy === 'all' && successCount === this.children.length) {
      return 'success'
    }
    if (this.successPolicy === 'any' && successCount > 0) {
      return 'success'
    }

    // 检查失败条件
    if (this.failurePolicy === 'all' && failureCount === this.children.length) {
      return 'failure'
    }
    if (this.failurePolicy === 'any' && failureCount > 0) {
      return 'failure'
    }

    return runningCount > 0 ? 'running' : 'success'
  }
}

// ==================== 装饰器节点 ====================

export abstract class BTDecorator extends BTNode {
  child: BTNode

  constructor(name: string, child: BTNode) {
    super(name)
    this.child = child
  }
}

/**
 * 反转节点 - 反转子节点结果
 */
export class BTInverter extends BTDecorator {
  tick(context: BTContext): BTNodeStatus {
    const status = this.child.tick(context)

    if (status === 'success') return 'failure'
    if (status === 'failure') return 'success'
    return 'running'
  }
}

/**
 * 重复节点 - 重复执行子节点N次
 */
export class BTRepeater extends BTDecorator {
  private count: number
  private current: number = 0

  constructor(name: string, child: BTNode, count: number = -1) {
    super(name, child)
    this.count = count  // -1 表示无限循环
  }

  tick(context: BTContext): BTNodeStatus {
    while (this.count < 0 || this.current < this.count) {
      const status = this.child.tick(context)

      if (status === 'running') {
        return 'running'
      }

      this.current++

      if (this.count > 0 && this.current >= this.count) {
        this.reset()
        return 'success'
      }
    }

    return 'success'
  }

  reset(): void {
    super.reset()
    this.current = 0
    this.child.reset()
  }
}

/**
 * 成功节点 - 无论子节点结果如何都返回success
 */
export class BTSucceeder extends BTDecorator {
  tick(context: BTContext): BTNodeStatus {
    this.child.tick(context)
    return 'success'
  }
}

/**
 * 失败节点 - 无论子节点结果如何都返回failure
 */
export class BTFailer extends BTDecorator {
  tick(context: BTContext): BTNodeStatus {
    this.child.tick(context)
    return 'failure'
  }
}

// ==================== 条件节点基类 ====================

export abstract class BTCondition extends BTNode {
  constructor(name: string) {
    super(name)
  }

  abstract check(context: BTContext): boolean

  tick(context: BTContext): BTNodeStatus {
    return this.check(context) ? 'success' : 'failure'
  }
}

// ==================== 行为节点基类 ====================

export abstract class BTAction extends BTNode {
  constructor(name: string) {
    super(name)
  }
}

// ==================== 行为树 ====================

export class BehaviorTree {
  root: BTNode
  context: BTContext

  constructor(root: BTNode, context: BTContext) {
    this.root = root
    this.context = context
  }

  tick(deltaTime: number): BTNodeStatus {
    this.context.deltaTime = deltaTime
    return this.root.tick(this.context)
  }

  reset(): void {
    this.root.reset()
  }
}

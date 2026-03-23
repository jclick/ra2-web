/**
 * AI 模块入口
 */

// 行为树核心
export {
  BTNode,
  BehaviorTree,
  BTComposite,
  BTDecorator,
  BTCondition,
  BTAction,
  BTSequence,
  BTSelector,
  BTParallel,
  BTRepeater,
  BTInverter,
  BTSucceeder,
  BTFailer
} from './BehaviorTree'
export type { BTNodeStatus, BTContext } from './BehaviorTree'

// 行为树工厂
export { BehaviorTreeFactory } from './BehaviorTreeFactory'

// AI 查询
export {
  AIQueries,
  CombatQueries,
  MovementQueries,
  EconomyQueries
} from './AIQueries'

// AI 动作
export {
  CombatActions,
  MovementActions,
  EconomyActions
} from './AIActions'

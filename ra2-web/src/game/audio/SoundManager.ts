/**
 * 音效管理器
 * 处理游戏音效、背景音乐、语音播放
 */

// 音效类型
export enum SoundType {
  UI_CLICK = 'ui_click',
  UI_HOVER = 'ui_hover',
  UI_ALERT = 'ui_alert',
  
  // 建筑
  BUILDING_PLACE = 'building_place',
  BUILDING_SELL = 'building_sell',
  BUILDING_DAMAGE = 'building_damage',
  BUILDING_DESTROY = 'building_destroy',
  CONSTRUCTION_COMPLETE = 'construction_complete',
  
  // 单位
  UNIT_SELECT = 'unit_select',
  UNIT_MOVE = 'unit_move',
  UNIT_ATTACK = 'unit_attack',
  UNIT_DAMAGE = 'unit_damage',
  UNIT_DESTROY = 'unit_destroy',
  UNIT_TRAIN = 'unit_train',
  
  // 武器
  WEAPON_FIRE = 'weapon_fire',
  WEAPON_HIT = 'weapon_hit',
  EXPLOSION = 'explosion',
  
  // 经济
  ORE_COLLECT = 'ore_collect',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  
  // 超级武器
  SUPERWEAPON_CHARGE = 'superweapon_charge',
  SUPERWEAPON_READY = 'superweapon_ready',
  SUPERWEAPON_FIRE = 'superweapon_fire',
  
  // EVA 语音
  EVA_BASE_UNDER_ATTACK = 'eva_base_under_attack',
  EVA_UNIT_LOST = 'eva_unit_lost',
  EVA_CONSTRUCTION_COMPLETE = 'eva_construction_complete',
  EVA_TECHNOLOGY_STOLEN = 'eva_technology_stolen',
  EVA_NEW_CONSTRUCTION_OPTIONS = 'eva_new_construction_options',
  EVA_CANNOT_DEPLOY_HERE = 'eva_cannot_deploy_here',
  EVA_INSUFFICIENT_FUNDS = 'eva_insufficient_funds',
  EVA_TRAINING = 'eva_training',
  EVA_UNIT_READY = 'eva_unit_ready',
  EVA_PROMOTED = 'eva_promoted',
  EVA_SELECT_TARGET = 'eva_select_target',
}

// 音效配置
interface SoundConfig {
  volume: number
  loop: boolean
  priority: number // 0-10, 越高越优先
}

const DEFAULT_CONFIG: SoundConfig = {
  volume: 1.0,
  loop: false,
  priority: 5,
}

// 音效缓存
interface CachedSound {
  buffer: AudioBuffer
  config: SoundConfig
}

/**
 * 音效管理器
 */
export class SoundManager {
  private ctx: AudioContext | null = null
  private sounds: Map<SoundType, CachedSound> = new Map()
  private bgmSource: AudioBufferSourceNode | null = null
  private bgmGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private evaGain: GainNode | null = null
  private masterGain: GainNode | null = null
  private isMuted: boolean = false
  private bgmVolume: number = 0.5
  private sfxVolume: number = 0.8
  private evaVolume: number = 1.0
  private currentBgm: string | null = null

  /**
   * 获取当前播放的BGM
   */
  getCurrentBgm(): string | null {
    return this.currentBgm
  }

  /**
   * 初始化音频系统
   */
  async initialize(): Promise<boolean> {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // 创建音量控制节点
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
      
      this.bgmGain = this.ctx.createGain()
      this.bgmGain.connect(this.masterGain)
      this.bgmGain.gain.value = this.bgmVolume
      
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.connect(this.masterGain)
      this.sfxGain.gain.value = this.sfxVolume
      
      this.evaGain = this.ctx.createGain()
      this.evaGain.connect(this.masterGain)
      this.evaGain.gain.value = this.evaVolume
      
      console.log('[Sound] 音频系统初始化成功')
      return true
    } catch (error) {
      console.error('[Sound] 音频系统初始化失败:', error)
      return false
    }
  }

  /**
   * 加载音效文件
   */
  async loadSound(type: SoundType, url: string, config: Partial<SoundConfig> = {}): Promise<void> {
    if (!this.ctx) return
    
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer)
      
      this.sounds.set(type, {
        buffer: audioBuffer,
        config: { ...DEFAULT_CONFIG, ...config },
      })
      
      console.log(`[Sound] 加载音效: ${type}`)
    } catch (error) {
      console.warn(`[Sound] 加载音效失败: ${type}`, error)
    }
  }

  /**
   * 播放音效
   */
  play(type: SoundType, volume?: number): void {
    if (!this.ctx || this.isMuted) return
    
    const sound = this.sounds.get(type)
    if (!sound) {
      console.warn(`[Sound] 音效未加载: ${type}`)
      return
    }
    
    // 创建音源
    const source = this.ctx.createBufferSource()
    source.buffer = sound.buffer
    
    // 创建音量节点
    const gain = this.ctx.createGain()
    gain.gain.value = volume ?? sound.config.volume
    
    // 连接节点
    source.connect(gain)
    gain.connect(this.sfxGain!)
    
    // 播放
    source.start(0)
    
    console.log(`[Sound] 播放: ${type}`)
  }

  /**
   * 播放 EVA 语音（优先级更高，可打断其他语音）
   */
  playEva(type: SoundType): void {
    if (!this.ctx || this.isMuted) return
    
    const sound = this.sounds.get(type)
    if (!sound) return
    
    const source = this.ctx.createBufferSource()
    source.buffer = sound.buffer
    source.connect(this.evaGain!)
    source.start(0)
  }

  /**
   * 播放背景音乐
   */
  playBgm(url: string, loop: boolean = true): void {
    if (!this.ctx || this.isMuted) return
    
    // 停止当前BGM
    this.stopBgm()
    
    // 加载并播放新BGM
    fetch(url)
      .then(r => r.arrayBuffer())
      .then(buffer => this.ctx!.decodeAudioData(buffer))
      .then(audioBuffer => {
        this.bgmSource = this.ctx!.createBufferSource()
        this.bgmSource.buffer = audioBuffer
        this.bgmSource.loop = loop
        this.bgmSource.connect(this.bgmGain!)
        this.bgmSource.start(0)
        this.currentBgm = url
      })
      .catch(err => console.warn('[Sound] BGM加载失败:', err))
  }

  /**
   * 停止背景音乐
   */
  stopBgm(): void {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop()
      } catch {}
      this.bgmSource = null
    }
    this.currentBgm = null
  }

  /**
   * 暂停/恢复音频上下文
   */
  suspend(): void {
    this.ctx?.suspend()
  }

  resume(): void {
    this.ctx?.resume()
  }

  /**
   * 静音控制
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1
    }
  }

  isAudioMuted(): boolean {
    return this.isMuted
  }

  /**
   * 音量控制
   */
  setBgmVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume))
    if (this.bgmGain) {
      this.bgmGain.gain.value = this.bgmVolume
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxVolume
    }
  }

  setEvaVolume(volume: number): void {
    this.evaVolume = Math.max(0, Math.min(1, volume))
    if (this.evaGain) {
      this.evaGain.gain.value = this.evaVolume
    }
  }

  /**
   * 生成合成音效（用于测试）
   */
  generateBeep(frequency: number = 440, duration: number = 0.1): void {
    if (!this.ctx || this.isMuted) return
    
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    
    osc.frequency.value = frequency
    osc.type = 'square'
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration)
    
    osc.connect(gain)
    gain.connect(this.sfxGain!)
    
    osc.start()
    osc.stop(this.ctx.currentTime + duration)
  }

  /**
   * 播放 UI 点击音效
   */
  playClick(): void {
    this.generateBeep(800, 0.05)
  }

  /**
   * 播放 UI 悬停音效
   */
  playHover(): void {
    this.generateBeep(400, 0.03)
  }

  /**
   * 播放警告音效
   */
  playAlert(): void {
    if (!this.ctx || this.isMuted) return
    
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    
    osc.frequency.setValueAtTime(880, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.2)
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2)
    
    osc.connect(gain)
    gain.connect(this.sfxGain!)
    
    osc.start()
    osc.stop(this.ctx.currentTime + 0.2)
  }
}

// 单例
let soundManager: SoundManager | null = null

export function getSoundManager(): SoundManager {
  if (!soundManager) {
    soundManager = new SoundManager()
  }
  return soundManager
}

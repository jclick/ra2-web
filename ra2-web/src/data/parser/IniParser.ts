/**
 * INI 文件解析器
 * 用于解析红警2的规则配置文件
 */

export interface IniSection {
  [key: string]: string
}

export interface IniData {
  [section: string]: IniSection
}

/**
 * INI 解析器
 */
export class IniParser {
  /**
   * 解析 INI 文本
   */
  static parse(text: string): IniData {
    const result: IniData = {}
    let currentSection = ''
    
    const lines = text.split(/\r?\n/)
    
    for (const rawLine of lines) {
      const line = rawLine.trim()
      
      // 跳过空行和注释
      if (!line || line.startsWith(';') || line.startsWith('#')) {
        continue
      }
      
      // 检查是否是节头 [Section]
      const sectionMatch = line.match(/^\[([^\]]+)\]$/)
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim()
        if (!result[currentSection]) {
          result[currentSection] = {}
        }
        continue
      }
      
      // 解析键值对 Key=Value
      const equalIndex = line.indexOf('=')
      if (equalIndex > 0 && currentSection) {
        const key = line.substring(0, equalIndex).trim()
        const value = line.substring(equalIndex + 1).trim()
        
        // 移除行内注释
        const commentIndex = value.indexOf(';')
        const cleanValue = commentIndex >= 0 
          ? value.substring(0, commentIndex).trim() 
          : value
        
        result[currentSection][key] = cleanValue
      }
    }
    
    return result
  }
  
  /**
   * 从 Uint8Array 解析
   */
  static parseBuffer(data: Uint8Array): IniData {
    const text = new TextDecoder('utf-8').decode(data)
    return IniParser.parse(text)
  }
  
  /**
   * 获取节
   */
  static getSection(data: IniData, section: string): IniSection | undefined {
    return data[section]
  }
  
  /**
   * 获取值
   */
  static getValue(data: IniData, section: string, key: string): string | undefined {
    return data[section]?.[key]
  }
  
  /**
   * 获取数值
   */
  static getNumber(data: IniData, section: string, key: string, defaultValue = 0): number {
    const value = IniParser.getValue(data, section, key)
    if (!value) return defaultValue
    
    const num = parseInt(value, 10)
    return isNaN(num) ? defaultValue : num
  }
  
  /**
   * 获取布尔值
   */
  static getBoolean(data: IniData, section: string, key: string, defaultValue = false): boolean {
    const value = IniParser.getValue(data, section, key)?.toLowerCase()
    if (!value) return defaultValue
    
    return value === 'yes' || value === 'true' || value === '1'
  }
  
  /**
   * 序列化为字符串
   */
  static stringify(data: IniData): string {
    const lines: string[] = []
    
    for (const [section, keys] of Object.entries(data)) {
      lines.push(`[${section}]`)
      
      for (const [key, value] of Object.entries(keys)) {
        lines.push(`${key}=${value}`)
      }
      
      lines.push('') // 空行分隔
    }
    
    return lines.join('\n')
  }
}

export default IniParser

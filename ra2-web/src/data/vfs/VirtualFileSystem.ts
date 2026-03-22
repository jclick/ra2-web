/**
 * 虚拟文件系统 - 管理游戏资源的内存存储
 */

export interface VFSFile {
  name: string
  path: string
  data: Uint8Array
  size: number
  lastModified: number
}

export class VirtualFileSystem {
  private files: Map<string, VFSFile> = new Map()
  private directories: Set<string> = new Set()

  /**
   * 添加文件到虚拟文件系统
   */
  addFile(file: VFSFile): void {
    const normalizedPath = this.normalizePath(file.path)
    this.files.set(normalizedPath, file)
    
    // 确保目录存在
    const dir = this.getDirectory(normalizedPath)
    if (dir) {
      this.directories.add(dir)
    }
  }

  /**
   * 从虚拟文件系统获取文件
   */
  getFile(path: string): VFSFile | undefined {
    const normalizedPath = this.normalizePath(path)
    return this.files.get(normalizedPath)
  }

  /**
   * 检查文件是否存在
   */
  exists(path: string): boolean {
    const normalizedPath = this.normalizePath(path)
    return this.files.has(normalizedPath)
  }

  /**
   * 列出目录中的文件
   */
  listDirectory(path: string): VFSFile[] {
    const normalizedPath = this.normalizePath(path)
    const prefix = normalizedPath.endsWith('/') ? normalizedPath : normalizedPath + '/'
    
    const result: VFSFile[] = []
    for (const [filePath, file] of this.files) {
      if (filePath.startsWith(prefix) && filePath !== prefix) {
        const relativePath = filePath.slice(prefix.length)
        // 只返回直接子文件，不返回孙子文件
        if (!relativePath.includes('/')) {
          result.push(file)
        }
      }
    }
    return result
  }

  /**
   * 递归列出目录中的所有文件
   */
  listDirectoryRecursive(path: string): VFSFile[] {
    const normalizedPath = this.normalizePath(path)
    const prefix = normalizedPath.endsWith('/') ? normalizedPath : normalizedPath + '/'
    
    const result: VFSFile[] = []
    for (const [filePath, file] of this.files) {
      if (filePath.startsWith(prefix) && filePath !== prefix) {
        result.push(file)
      }
    }
    return result
  }

  /**
   * 搜索文件
   */
  searchFiles(pattern: string | RegExp): VFSFile[] {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i')
    const result: VFSFile[] = []
    
    for (const file of this.files.values()) {
      if (regex.test(file.name) || regex.test(file.path)) {
        result.push(file)
      }
    }
    return result
  }

  /**
   * 从浏览器File对象创建VFSFile
   */
  static async fromFile(file: File, targetPath: string = ''): Promise<VFSFile> {
    const arrayBuffer = await file.arrayBuffer()
    const path = targetPath ? `${targetPath}/${file.name}` : file.name
    
    return {
      name: file.name,
      path: path,
      data: new Uint8Array(arrayBuffer),
      size: file.size,
      lastModified: file.lastModified,
    }
  }

  /**
   * 从Uint8Array创建VFSFile
   */
  static fromData(name: string, data: Uint8Array, path: string = ''): VFSFile {
    const fullPath = path ? `${path}/${name}` : name
    return {
      name,
      path: fullPath,
      data,
      size: data.length,
      lastModified: Date.now(),
    }
  }

  /**
   * 删除文件
   */
  deleteFile(path: string): boolean {
    const normalizedPath = this.normalizePath(path)
    return this.files.delete(normalizedPath)
  }

  /**
   * 清空文件系统
   */
  clear(): void {
    this.files.clear()
    this.directories.clear()
  }

  /**
   * 获取所有文件
   */
  getAllFiles(): VFSFile[] {
    return Array.from(this.files.values())
  }

  /**
   * 获取文件数量
   */
  getFileCount(): number {
    return this.files.size
  }

  /**
   * 获取总大小
   */
  getTotalSize(): number {
    let total = 0
    for (const file of this.files.values()) {
      total += file.size
    }
    return total
  }

  /**
   * 规范化路径
   */
  private normalizePath(path: string): string {
    // 移除开头的 ./
    let normalized = path.replace(/^\.\//, '')
    // 统一使用正斜杠
    normalized = normalized.replace(/\\/g, '/')
    // 移除重复的斜杠
    normalized = normalized.replace(/\/+/g, '/')
    // 移除结尾的斜杠（除非是根路径）
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }
    return normalized.toLowerCase()
  }

  /**
   * 获取路径的目录部分
   */
  private getDirectory(path: string): string | null {
    const lastSlash = path.lastIndexOf('/')
    if (lastSlash === -1) return null
    return path.slice(0, lastSlash)
  }
}

// 单例实例
export const vfs = new VirtualFileSystem()

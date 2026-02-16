// Memory optimization utilities for the application

// Memory optimization utilities for the application


export class MemoryOptimizer {
  private static instance: MemoryOptimizer
  private isOptimizing = false

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer()
    }
    return MemoryOptimizer.instance
  }

  // Get current memory usage
  getMemoryUsage() {
    const usage = process.memoryUsage()
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // Resident Set Size in MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // Total heap size in MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // Used heap in MB
      external: Math.round(usage.external / 1024 / 1024), // External memory in MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // Array buffers in MB
    }
  }

  // Force garbage collection if available
  forceGarbageCollection(): boolean {
    try {
      if ((global as any).gc) {
        (global as any).gc()
        return true
      }
      return false
    } catch (error) {
      console.error('Garbage collection failed:', error)
      return false
    }
  }

  // Optimize memory usage
  async optimizeMemory(): Promise<void> {
    if (this.isOptimizing) {
      console.log('Memory optimization already in progress')
      return
    }

    this.isOptimizing = true
    const beforeMemory = this.getMemoryUsage()

    try {
      console.log('Starting memory optimization...', beforeMemory)

      // Force garbage collection
      const gcSuccess = this.forceGarbageCollection()
      if (gcSuccess) {
        console.log('Garbage collection completed')
      }

      // Clear any caches if they exist
      if ((global as any).cache) {
        (global as any).cache.clear?.()
        console.log('Application caches cleared')
      }

      // Wait a moment for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 1000))

      const afterMemory = this.getMemoryUsage()
      const memoryFreed = beforeMemory.heapUsed - afterMemory.heapUsed

      console.log('Memory optimization completed:', {
        before: beforeMemory,
        after: afterMemory,
        freed: `${memoryFreed}MB`,
        gcSuccess
      })

    } catch (error) {
      console.error('Memory optimization failed:', error)
    } finally {
      this.isOptimizing = false
    }
  }

  // Check if memory usage is critical
  isMemoryCritical(): boolean {
    const usage = this.getMemoryUsage()
    const memoryPercentage = (usage.heapUsed / usage.heapTotal) * 100
    return memoryPercentage > 85 || usage.heapUsed > 1000 // 85% or 1GB+
  }

  // Get memory status
  getMemoryStatus(): 'healthy' | 'warning' | 'critical' {
    const usage = this.getMemoryUsage()
    const memoryPercentage = (usage.heapUsed / usage.heapTotal) * 100

    if (memoryPercentage > 85 || usage.heapUsed > 1000) {
      return 'critical'
    } else if (memoryPercentage > 70 || usage.heapUsed > 500) {
      return 'warning'
    }
    return 'healthy'
  }

  // Get recommendations based on memory usage
  getRecommendations(): string[] {
    const usage = this.getMemoryUsage()
    const status = this.getMemoryStatus()
    const recommendations: string[] = []

    switch (status) {
      case 'critical':
        recommendations.push('CRITICAL: Memory usage is critically high')
        recommendations.push('Restart the application immediately')
        recommendations.push('Consider increasing system RAM')
        recommendations.push('Review for memory leaks in the code')
        break
      case 'warning':
        recommendations.push('WARNING: Memory usage is elevated')
        recommendations.push('Monitor for memory leaks')
        recommendations.push('Consider optimizing database queries')
        recommendations.push('Clear unnecessary caches')
        break
      default:
        recommendations.push('Memory usage is optimal')
    }

    if (usage.heapUsed > 200) {
      recommendations.push('Consider implementing data pagination')
      recommendations.push('Optimize large data processing operations')
    }

    return recommendations
  }
}

export const memoryOptimizer = MemoryOptimizer.getInstance()

// Auto-optimization based on memory usage
setInterval(async () => {
  if (memoryOptimizer.isMemoryCritical()) {
    console.warn('Critical memory usage detected - triggering auto-optimization')
    await memoryOptimizer.optimizeMemory()
  }
}, 2 * 60 * 1000) // Check every 2 minutes

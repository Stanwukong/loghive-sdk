// src/circuit-breaker.ts

/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by stopping requests to a failing service
 * and allowing it time to recover.
 *
 * States:
 * - CLOSED: Normal operation, all requests pass through
 * - OPEN: Service is failing, all requests are blocked
 * - HALF_OPEN: Testing if service has recovered
 */

export enum CircuitBreakerState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerConfig {
  /**
   * Number of consecutive failures before opening the circuit
   * @default 5
   */
  failureThreshold?: number;

  /**
   * Time in milliseconds to wait before attempting recovery (half-open state)
   * @default 30000 (30 seconds)
   */
  cooldownMs?: number;

  /**
   * Optional callback for state transitions
   */
  onStateChange?: (state: CircuitBreakerState, reason: string) => void;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private config: Required<Omit<CircuitBreakerConfig, "onStateChange">> & {
    onStateChange?: (state: CircuitBreakerState, reason: string) => void;
  };

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      cooldownMs: config.cooldownMs || 30000,
      onStateChange: config.onStateChange,
    };
  }

  /**
   * Get current circuit breaker state
   */
  public getState(): CircuitBreakerState {
    // Check if cooldown period has elapsed while in OPEN state
    if (this.state === CircuitBreakerState.OPEN) {
      const now = Date.now();
      const timeSinceFailure = now - this.lastFailureTime;

      if (timeSinceFailure >= this.config.cooldownMs) {
        this.transitionTo(
          CircuitBreakerState.HALF_OPEN,
          "Cooldown period elapsed, testing service recovery"
        );
      }
    }

    return this.state;
  }

  /**
   * Check if a request should be allowed through
   */
  public async execute<T>(
    operation: () => Promise<T>
  ): Promise<{ success: boolean; result?: T; error?: Error }> {
    const currentState = this.getState();

    // Block requests when circuit is OPEN
    if (currentState === CircuitBreakerState.OPEN) {
      return {
        success: false,
        error: new Error(
          `Circuit breaker is OPEN. Service will be retried after cooldown period.`
        ),
      };
    }

    // Execute the operation
    try {
      const result = await operation();
      this.onSuccess();
      return { success: true, result };
    } catch (error) {
      this.onFailure();
      return { success: false, error: error as Error };
    }
  }

  /**
   * Record a successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;

      // After a successful test in HALF_OPEN, close the circuit
      this.transitionTo(
        CircuitBreakerState.CLOSED,
        "Service recovered successfully"
      );
    }
  }

  /**
   * Record a failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Failure during testing, reopen the circuit
      this.transitionTo(
        CircuitBreakerState.OPEN,
        "Service still failing during recovery test"
      );
    } else if (
      this.state === CircuitBreakerState.CLOSED &&
      this.failureCount >= this.config.failureThreshold
    ) {
      // Threshold reached, open the circuit
      this.transitionTo(
        CircuitBreakerState.OPEN,
        `Failure threshold (${this.config.failureThreshold}) reached`
      );
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitBreakerState, reason: string): void {
    if (this.state === newState) {
      return;
    }

    const previousState = this.state;
    this.state = newState;

    // Reset counters on state change
    if (newState === CircuitBreakerState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
    } else if (newState === CircuitBreakerState.HALF_OPEN) {
      this.successCount = 0;
    }

    // Notify state change
    if (this.config.onStateChange) {
      this.config.onStateChange(newState, reason);
    }

    // Log state transition
    console.log(
      `[CircuitBreaker] State transition: ${previousState} → ${newState} | Reason: ${reason}`
    );
  }

  /**
   * Manually reset the circuit breaker to CLOSED state
   */
  public reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.transitionTo(
      CircuitBreakerState.CLOSED,
      "Manual reset by application"
    );
  }

  /**
   * Get current failure count
   */
  public getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Get current success count (relevant in HALF_OPEN state)
   */
  public getSuccessCount(): number {
    return this.successCount;
  }

  /**
   * Get time until circuit will attempt recovery (OPEN → HALF_OPEN)
   * Returns 0 if not in OPEN state
   */
  public getTimeUntilRetry(): number {
    if (this.state !== CircuitBreakerState.OPEN) {
      return 0;
    }

    const now = Date.now();
    const timeSinceFailure = now - this.lastFailureTime;
    const remaining = this.config.cooldownMs - timeSinceFailure;

    return Math.max(0, remaining);
  }

  /**
   * Check if circuit breaker is currently allowing requests
   */
  public isOpen(): boolean {
    return this.getState() === CircuitBreakerState.OPEN;
  }

  /**
   * Check if circuit breaker is in closed state (normal operation)
   */
  public isClosed(): boolean {
    return this.getState() === CircuitBreakerState.CLOSED;
  }

  /**
   * Check if circuit breaker is testing recovery
   */
  public isHalfOpen(): boolean {
    return this.getState() === CircuitBreakerState.HALF_OPEN;
  }
}

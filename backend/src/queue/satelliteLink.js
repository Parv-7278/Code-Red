const PriorityQueue = require('./PriorityQueue');
const { PRIORITY } = require('./PriorityLevels');

/**
 * SatelliteLinkSimulator
 * Simulates constrained satellite bandwidth, packet transmission intervals,
 * and propagation delays over Antarctic communication links.
 */
class SatelliteLinkSimulator {
  constructor(options = {}) {
    this.queue = new PriorityQueue();
    this.intervalId = null;

    // Simulation timing parameters
    this.normalIntervalMs = options.normalIntervalMs || 800; // Simulated satellite rate limiter
    this.basePropagationDelayMs = options.basePropagationDelayMs || 240; // GEO/LEO propagation delay

    this.latencyHistory = [];
    this.maxHistoryLength = 100;
    this.listeners = [];
  }

  onPacketProcessed(listener) {
    this.listeners.push(listener);
  }

  submitPacket(packet, priorityLevel = PRIORITY.NORMAL) {
    const enqueued = this.queue.enqueue(packet, priorityLevel);

    // Fast-track a newly queued critical packet immediately. This prioritizes
    // the next packet; it does not interrupt a packet already in transmission.
    if (enqueued.priority_level === PRIORITY.CRITICAL) {
      this.processNextPacket();
    } else {
      this.startLinkScheduler();
    }

    return enqueued;
  }

  startLinkScheduler() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      if (this.queue.isEmpty()) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        return;
      }
      this.processNextPacket();
    }, this.normalIntervalMs);
  }

  processNextPacket() {
    if (this.queue.isEmpty()) return null;

    const message = this.queue.dequeue();
    const sentTime = Date.now();
    const createdTime = message.created_timestamp || message.queued_timestamp || sentTime;

    // 1. Calculate Queue Delay: queue delay = sent time - created time
    const queueDelayMs = Math.max(0, sentTime - createdTime);

    // 2. Simulated Transmission Delay (Propagation + Jitter)
    const jitter = Math.floor(Math.random() * 50) - 25;
    const simulatedTransmissionMs = Math.max(100, this.basePropagationDelayMs + jitter);
    const receivedTime = sentTime + simulatedTransmissionMs;

    // 3. Calculate Total Latency: total simulated latency = received time - created time
    const totalSimulatedLatencyMs = queueDelayMs + simulatedTransmissionMs;

    const messageRecord = {
      message_id: message.message_id,
      station_id: message.station_id,
      message_type: message.message_type,
      priority: message.priority,
      priority_level: message.priority_level,
      
      // Timestamps
      created_timestamp: createdTime,
      created_at: new Date(createdTime).toISOString(),
      sent_timestamp: sentTime,
      sent_at: new Date(sentTime).toISOString(),
      received_timestamp: receivedTime,
      received_at: new Date(receivedTime).toISOString(),

      // Latency Calculations (Clearly labeled as Simulated)
      queue_delay_ms: queueDelayMs,
      simulated_transmission_ms: simulatedTransmissionMs,
      total_simulated_latency_ms: totalSimulatedLatencyMs,
      label: 'Simulated Latency',
      disclaimer: 'Simulated Latency: Calculated for prototype demonstration of queueing behavior.',

      data: message.data || message,
    };

    // Store in history
    this.latencyHistory.unshift(messageRecord);
    if (this.latencyHistory.length > this.maxHistoryLength) {
      this.latencyHistory.pop();
    }

    // Broadcast to listeners
    this.listeners.forEach((listener) => {
      try {
        listener(messageRecord);
      } catch (err) {
        console.error('[SatelliteLink] Error in listener:', err);
      }
    });

    return messageRecord;
  }

  getMetrics() {
    const criticalList = this.latencyHistory.filter(m => m.priority_level === PRIORITY.CRITICAL);
    const highList = this.latencyHistory.filter(m => m.priority_level === PRIORITY.HIGH);
    const normalList = this.latencyHistory.filter(m => m.priority_level === PRIORITY.NORMAL);
    const lowList = this.latencyHistory.filter(m => m.priority_level === PRIORITY.LOW);

    const avg = (arr, key) => arr.length ? Math.round(arr.reduce((acc, x) => acc + x[key], 0) / arr.length) : 0;

    return {
      label: 'Simulated Latency Monitor',
      queueSnapshot: this.queue.getSnapshot(),
      recentLogs: this.latencyHistory.slice(0, 30),
      summary: {
        totalProcessed: this.latencyHistory.length,
        critical: {
          count: criticalList.length,
          avgQueueDelayMs: avg(criticalList, 'queue_delay_ms'),
          avgTotalLatencyMs: avg(criticalList, 'total_simulated_latency_ms'),
        },
        high: {
          count: highList.length,
          avgQueueDelayMs: avg(highList, 'queue_delay_ms'),
          avgTotalLatencyMs: avg(highList, 'total_simulated_latency_ms'),
        },
        normal: {
          count: normalList.length,
          avgQueueDelayMs: avg(normalList, 'queue_delay_ms'),
          avgTotalLatencyMs: avg(normalList, 'total_simulated_latency_ms'),
        },
        low: {
          count: lowList.length,
          avgQueueDelayMs: avg(lowList, 'queue_delay_ms'),
          avgTotalLatencyMs: avg(lowList, 'total_simulated_latency_ms'),
        },
      }
    };
  }
}

const defaultSatelliteLink = new SatelliteLinkSimulator();

module.exports = {
  SatelliteLinkSimulator,
  defaultSatelliteLink,
};

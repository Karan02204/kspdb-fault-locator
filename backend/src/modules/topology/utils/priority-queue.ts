export interface PriorityQueueItem<T> {
  priority: number;
  value: T;
}

export class PriorityQueue<T> {
  private items: PriorityQueueItem<T>[] = [];

  enqueue(value: T, priority: number): void {
    this.items.push({
      value,
      priority,
    });

    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): PriorityQueueItem<T> | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}

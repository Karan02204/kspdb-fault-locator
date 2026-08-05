export class TopologyConfidenceBuilder {
  calculate(distance: number, maxDistance: number): number {
    if (maxDistance === 0) {
      return 0.95;
    }

    const normalizedDistance = distance / maxDistance;

    return Math.max(0.6, Math.min(0.95, 0.95 - normalizedDistance * 0.35));
  }
}

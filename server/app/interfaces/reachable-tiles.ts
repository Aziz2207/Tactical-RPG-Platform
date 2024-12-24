export interface ReachableTiles {
    visited: Set<string>;
    costs: Map<string, number>;
    reachable: [number, number][];
}

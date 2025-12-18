import { EvalResult } from "@/lib/db";

export interface MetricAggregation {
    type: "number" | "boolean" | "string";
    count: number;
    stats?: {
        avg?: number;
        min?: number;
        max?: number;
        median?: number;
        p90?: number;
    };
    distribution?: Record<string, number>; // For enums, booleans, or histogram buckets
}

export interface AggregatedReport {
    totalRuns: number;
    metrics: Record<string, MetricAggregation>;
}

export class AggregationService {

    aggregate(results: EvalResult[], schema?: Record<string, string>): AggregatedReport {
        if (results.length === 0) {
            return { totalRuns: 0, metrics: {} };
        }

        // 1. Identify all keys across results (or use schema if provided)
        // If schema is not provided, we infer types from the first result.
        // However, robust aggregation should scan all values or rely on strict schema.
        const keys = schema ? Object.keys(schema) : this.inferKeys(results);

        const metrics: Record<string, MetricAggregation> = {};

        keys.forEach(key => {
            const values = results.map(r => r.metrics[key]).filter(v => v !== undefined && v !== null);
            if (values.length === 0) return;

            // Determine type from schema or first value
            const typeStr = schema ? schema[key] : typeof values[0];

            if (typeStr === 'number') {
                metrics[key] = this.aggregateNumber(values as number[]);
            } else if (typeStr === 'boolean' || typeof values[0] === 'boolean') {
                metrics[key] = this.aggregateBoolean(values as boolean[]);
            } else {
                // Default to String/Enum aggregation
                metrics[key] = this.aggregateString(values as string[]);
            }
        });

        return {
            totalRuns: results.length,
            metrics
        };
    }

    private inferKeys(results: EvalResult[]): string[] {
        const allKeys = new Set<string>();
        results.forEach(r => Object.keys(r.metrics).forEach(k => allKeys.add(k)));
        return Array.from(allKeys);
    }

    private aggregateNumber(values: number[]): MetricAggregation {
        values.sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = values[0];
        const max = values[values.length - 1];
        const median = values[Math.floor(values.length / 2)];
        const p90 = values[Math.floor(values.length * 0.9)];

        // Simple Histogram (Distribution) - 1-5 scale or similar assumption?
        // Or auto-bucket? For now, let's just count distinct values if unique count < 20 (like integers),
        // else maybe buckets. Let's stick to distinct matching for now (good for 1-5 ratings).
        const distribution: Record<string, number> = {};
        values.forEach(v => {
            distribution[v] = (distribution[v] || 0) + 1;
        });

        return {
            type: "number",
            count: values.length,
            stats: { avg, min, max, median, p90 },
            distribution
        };
    }

    private aggregateBoolean(values: boolean[]): MetricAggregation {
        const distribution: Record<string, number> = {
            true: 0,
            false: 0
        };
        values.forEach(v => distribution[String(v)]++);

        return {
            type: "boolean",
            count: values.length,
            distribution
        };
    }

    private aggregateString(values: string[]): MetricAggregation {
        const distribution: Record<string, number> = {};
        values.forEach(v => {
            // Truncate long strings to avoid flooding map? 
            // Assuming short enum-like strings.
            const key = v.length > 50 ? v.substring(0, 50) + "..." : v;
            distribution[key] = (distribution[key] || 0) + 1;
        });


        return {
            type: "string",
            count: values.length,
            distribution
        };
    }
}

export const aggregationService = new AggregationService();

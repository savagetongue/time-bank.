/**
 * Core utilities for the Cloudflare Durable Object and KV template
 * STRICTLY DO NOT MODIFY THIS FILE - Hidden from AI to prevent breaking core functionality
 */
export interface Env {
    ASSETS: Fetcher;
    DB_HOST?: string;
    DB_USER?: string;
    DB_PASS?: string;
    DB_NAME?: string;
    DB_PORT?: string;
}
export type AuthEnv = {
    Variables: {
        userId: number;
    };
    Bindings: Env;
}
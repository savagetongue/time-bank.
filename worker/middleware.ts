import { MiddlewareHandler } from "hono/types";
import { AuthEnv } from "./core-utils";
export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    const token = authHeader.substring(7);
    // In a real app, you'd verify a JWT. Here we just check our mock token format.
    if (!token.startsWith('mock-token-for-user-')) {
        return c.json({ success: false, error: 'Invalid token' }, 401);
    }
    const userId = parseInt(token.replace('mock-token-for-user-', ''), 10);
    if (isNaN(userId)) {
        return c.json({ success: false, error: 'Invalid token format' }, 401);
    }
    c.set('userId', userId);
    await next();
};
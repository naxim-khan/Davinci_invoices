// import { AsyncLocalStorage } from 'async_hooks';
// import { RequestContext, CurrentUser } from './request-context.interface';
// import { randomUUID } from 'crypto';

// /**
//  * Async Context Manager
//  * 
//  * Manages request-scoped context using Node.js AsyncLocalStorage.
//  * This allows us to access request-specific data (user, requestId, etc.)
//  * from anywhere in the application without explicitly passing it.
//  */
// class AsyncContextManager {
//     private storage = new AsyncLocalStorage<RequestContext>();

//     /**
//      * Run a function within a new context
//      */
//     run<T>(context: Partial<RequestContext>, callback: () => T): T {
//         const fullContext: RequestContext = {
//             requestId: context.requestId ?? randomUUID(),
//             traceId: context.traceId,
//             user: context.user,
//             startTime: context.startTime ?? Date.now(),
//             path: context.path,
//             method: context.method,
//         };

//         return this.storage.run(fullContext, callback);
//     }

//     /**
//      * Get the current context
//      */
//     getContext(): RequestContext | undefined {
//         return this.storage.getStore();
//     }

//     /**
//      * Get the current user from context
//      */
//     getCurrentUser(): CurrentUser | undefined {
//         return this.getContext()?.user;
//     }

//     /**
//      * Get the current request ID
//      */
//     getRequestId(): string | undefined {
//         return this.getContext()?.requestId;
//     }

//     /**
//      * Get the current trace ID
//      */
//     getTraceId(): string | undefined {
//         return this.getContext()?.traceId;
//     }

//     /**
//      * Set the current user in the context
//      */
//     setCurrentUser(user: CurrentUser): void {
//         const context = this.getContext();
//         if (context) {
//             context.user = user;
//         }
//     }

//     /**
//      * Update context with partial data
//      */
//     updateContext(updates: Partial<RequestContext>): void {
//         const context = this.getContext();
//         if (context) {
//             Object.assign(context, updates);
//         }
//     }

//     /**
//      * Check if we're currently in a context
//      */
//     isInContext(): boolean {
//         return this.getContext() !== undefined;
//     }
// }

// export const asyncContext = new AsyncContextManager();

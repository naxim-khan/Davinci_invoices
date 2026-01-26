// import { Container } from 'inversify';
// import { getRouteInfo, InversifyExpressServer } from 'inversify-express-utils';
// import { logger } from '../common/utils/logger.util';

// /**
//  * Controller Loader
//  * 
//  * This module auto-discovers and loads all controllers.
//  * Controllers are decorated with @controller() from inversify-express-utils.
//  */
// export function loadControllers(): void {
//     // Import all controllers here
//     // The @controller() decorator automatically registers them
//     import('../../modules/auth/controllers/auth.controller');
//     import('../../modules/users/controllers/users.controller');

//     logger.info('✅ Controllers loaded successfully');
// }

// /**
//  * Log all registered routes
//  */
// export function logRoutes(server: InversifyExpressServer, container: Container): void {
//     const routeInfo = getRouteInfo(container);

//     logger.info('📍 Registered Routes:');
//     routeInfo.forEach((route) => {
//         route.endpoints.forEach((endpoint) => {
//             const path = route.controller + endpoint.route;
//             logger.info(`   ${endpoint.method.toUpperCase().padEnd(7)} ${path}`);
//         });
//     });
// }

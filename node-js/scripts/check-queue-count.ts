
import { prisma } from '../src/core/database/prisma.client';

async function main() {
    try {
        const count = await prisma.flightProcessingQueue.count();
        console.log(`FlightProcessingQueue items: ${count}`);

        // Also list the first few if any
        if (count > 0) {
            const items = await prisma.flightProcessingQueue.findMany({ take: 5 });
            console.log('First 5 items:', items);
        }
    } catch (error) {
        console.error('Error counting queue:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

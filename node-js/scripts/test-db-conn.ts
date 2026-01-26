import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function testConnection() {
    console.log('Testing connection to:', process.env.DATABASE_URL?.split('@')[1]);
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('Successfully connected to Postgres');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
        client.release();
    } catch (err) {
        console.error('Connection test failed:', err);
    } finally {
        await pool.end();
    }
}

testConnection();

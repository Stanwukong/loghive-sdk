import { RemoteLogger } from './src/logger'

async function testConnection() {
    const logger = new RemoteLogger({
        apiKey: '60e1ba75-a67e-480a-8b9c-1e615ce3a987',
        projectId: '6884171e07ebd35a3e34a5ba',
        endpoint: 'http://localhost:5000/api/v1',
        batchSize: 1,
        flushIntervalMs: 1000,
    })

    try {
        logger.info('Test log message', { test: true})

        await logger.flush()

        console.log('✅ Connection test successful!')
    } catch (error) {
        console.error('❌ Connection test failed:', error);
    } finally {
        await logger.shutdown()
    }
 }

 testConnection()
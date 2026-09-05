const config = {
    apiUrl: process.env.API_URL || 'http://localhost:3001/api',
    usermail: process.env.USER_EMAIL || 'imtester@mail.com',
    password: process.env.USER_PASSWORD || 'imtester123',
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'articlehub_test',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
    },
};

export { config };
const { env } = require('process');

module.exports = {
    earlyAccess: true,
    datasources: {
        db: {
            url: env.DATABASE_URL,
        },
    },
};

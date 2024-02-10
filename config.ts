import * as dotenv from 'dotenv'
dotenv.config();
export const config = {
    Host: 'localhost',
    Port: 3000,
    RedisHost: '172.17.0.4',
    RedisPort: 6379,
    Origin: '*',
    Secret: process.env.SECRET,
};


export default config;

import * as dotenv from 'dotenv';

dotenv.config()

export const ENV = {
    env:process.env.ENV || 'localTest',
    localTest:{
        Host:"localhost",
        Port:3000,
        RedisHost:"172.17.0.3",
        RedisPort:6379,
        Origin:"*",
        Secret:"test",
    },
    Dev:{
        Host:process.env.HOST||"localhost",
        Port:process.env.PORT||"3000",
        RedisHost:process.env.REDIS_HOST||"localhost",
        RedisPort:process.env.REDIS_PORT||"6379",
        Origin:process.env.ORIGIN||"*",
        Secret:process.env.SECRET||"test"
    }
}

const config = ENV[ENV.env]

export default config
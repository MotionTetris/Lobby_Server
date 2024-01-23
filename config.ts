import * as dotenv from 'dotenv';

dotenv.config()

export const config = {
    env:process.env.ENV || 'localTest',
    localTest:{
        RedisHost:"172.17.0.3",
        RedisPort:6379,
    },
    Develope:{
        
    }
}
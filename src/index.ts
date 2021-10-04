import dotenv from 'dotenv';
dotenv.config();

import httpServer from './http';
import createServer from './socket';

const io = createServer(httpServer);

httpServer.listen(process.env.PORT,()=>{
    console.log('Server running on port: '+process.env.PORT)
})
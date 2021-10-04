import express from 'express';
import cors from 'cors';
import {Server} from 'http';

const app = express();
const httpServer = new Server(app);

app.use(cors());
app.use(express.json());

app.get('/',(req,res)=>{
    res.status(200).send('You made it :D');
})

export default httpServer;
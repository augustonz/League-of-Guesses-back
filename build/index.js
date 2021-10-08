"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = __importDefault(require("./http"));
const socket_1 = __importDefault(require("./socket"));
const io = (0, socket_1.default)(http_1.default);
http_1.default.listen(process.env.PORT, () => {
    console.log('Server running on port: ' + process.env.PORT);
});

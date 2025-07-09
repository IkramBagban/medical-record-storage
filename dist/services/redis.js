"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = exports.RedisService = void 0;
const redis_1 = require("redis");
class RedisService {
    constructor(config) {
        const validated = RedisService.validateConfig(config);
        this.client = (0, redis_1.createClient)({
            username: validated.username || "default",
            password: validated.password,
            socket: {
                host: validated.host,
                port: validated.port,
            },
        });
        this.client.on("connect", () => {
            console.log("Redis connected successfully");
        });
        this.client.on("error", (err) => {
            console.error("Redis connection error:", err);
        });
        this.client.on("close", () => {
            console.log("Redis connection closed");
        });
        this.connect();
    }
    static validateConfig(config) {
        const { host, port, password, username } = config;
        console.log("redis config", config);
        const missing = [];
        if (!host)
            missing.push("host");
        if (!port)
            missing.push("port");
        if (!password)
            missing.push("password");
        if (missing.length > 0) {
            throw new Error(`Missing Redis config values: ${missing.join(", ")}`);
        }
        return {
            host: host,
            port: port,
            password: password,
            username: username || "default",
        };
    }
    static getInstance(config) {
        console.log("config", config);
        if (!RedisService.instance) {
            if (!config) {
                throw new Error("RedisService: No config provided. Please call getInstance(config) with Redis connection info.");
            }
            RedisService.instance = new RedisService(config);
        }
        return RedisService.instance;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.client.isOpen) { 
                    yield this.client.connect();
                }
                console.log("Connected to Redis");
            }
            catch (error) {
                console.error("Failed to connect to Redis:", error);
                throw error;
            }
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.disconnect();
        });
    }
    set(key, value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const storeValue = (options === null || options === void 0 ? void 0 : options.json) === true ? JSON.stringify(value) : String(value);
                const _a = options || {}, { json } = _a, redisOptions = __rest(_a, ["json"]);
                yield this.client.set(key, storeValue, redisOptions);
            }
            catch (error) {
                console.error("Error setting Redis key:", error);
            }
        });
    }
    get(key, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const value = yield this.client.get(key);
                if (!value)
                    return null;
                return (options === null || options === void 0 ? void 0 : options.json) === true ? JSON.parse(value) : value;
            }
            catch (error) {
                console.error("Error getting Redis key:", error);
                return null;
            }
        });
    }
    del(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.client.del(key);
                return true;
            }
            catch (error) {
                console.error(`Failed to delete key "${key}":`, error);
                return false;
            }
        });
    }
    incr(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const value = yield this.client.incr(key);
                return value;
            }
            catch (error) {
                console.error(`Failed to increment key "${key}":`, error);
                throw error;
            }
        });
    }
    deleteKeysByPattern(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            let cursor = "0";
            let totalDeleted = 0;
            while (true) {
                const { cursor: nextCursor, keys } = yield this.client.scan(cursor, {
                    MATCH: pattern,
                });
                if (Array.isArray(keys) && keys.length > 0) {
                    console.log(`Deleting keys: ${keys.join(", ")}`);
                    const deletedCount = yield this.client.del(keys);
                    console.log(`Deleted ${deletedCount} keys matching pattern "${pattern}"`);
                    totalDeleted += keys.length;
                }
                if (nextCursor === "0")
                    break;
                cursor = nextCursor;
            }
            console.log(`🧹 Deleted ${totalDeleted} keys matching pattern "${pattern}"`);
        });
    }
    expire(key, seconds) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.expire(key, seconds);
        });
    }
    ping() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.client.ping();
        });
    }
    isConnected() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.ping();
                return true;
            }
            catch (error) {
                return false;
            }
        });
    }
}
exports.RedisService = RedisService;
exports.redisService = RedisService.getInstance({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
});

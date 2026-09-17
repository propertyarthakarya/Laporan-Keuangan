"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = __importDefault(require("../lib/cloudinary"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // maksimal 5 MB
    },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('File harus berupa JPG atau PNG'));
        }
    },
});
router.post('/transaction-proof', auth_1.requireAuth, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: 'Bukti transaksi belum dipilih',
            });
        }
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary_1.default.uploader.upload_stream({
                folder: 'financial-reporting/transaction-proofs',
                resource_type: 'image',
            }, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            });
            stream.end(req.file.buffer);
        });
        return res.json({
            message: 'Bukti transaksi berhasil diupload',
            url: result.secure_url,
            publicId: result.public_id,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;

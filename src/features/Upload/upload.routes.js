const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../features/Auth/auth.middleware');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create subdirectory based on upload type
        const type = req.query.type || 'general';
        const subDir = path.join(uploadDir, type);

        if (!fs.existsSync(subDir)) {
            fs.mkdirSync(subDir, { recursive: true });
        }

        cb(null, subDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    },
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif, webp, svg)'), false);
    }
};

// Configure multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
});

/**
 * POST /api/upload
 * Upload a single image file
 * Query params:
 *   - type: subdirectory (avatar, banner, professional, service, etc.)
 */
router.post('/', authenticate, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo enviado',
            });
        }

        const type = req.query.type || 'general';
        const fileUrl = `/uploads/${type}/${req.file.filename}`;

        res.json({
            success: true,
            message: 'Arquivo enviado com sucesso',
            data: {
                filename: req.file.filename,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                url: fileUrl,
            },
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao fazer upload do arquivo',
        });
    }
});

/**
 * POST /api/upload/multiple
 * Upload multiple image files (max 10)
 */
router.post('/multiple', authenticate, upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo enviado',
            });
        }

        const type = req.query.type || 'general';
        const files = req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            url: `/uploads/${type}/${file.filename}`,
        }));

        res.json({
            success: true,
            message: `${files.length} arquivo(s) enviado(s) com sucesso`,
            data: files,
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao fazer upload dos arquivos',
        });
    }
});

/**
 * DELETE /api/upload
 * Delete a file by URL
 */
router.delete('/', authenticate, (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL do arquivo não fornecida',
            });
        }

        // Extract filename from URL (e.g., /uploads/avatar/123456.jpg)
        const relativePath = url.replace('/uploads/', '');
        const filePath = path.join(uploadDir, relativePath);

        // Security check - ensure file is within upload directory
        if (!filePath.startsWith(uploadDir)) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado',
            });
        }

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({
                success: true,
                message: 'Arquivo removido com sucesso',
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Arquivo não encontrado',
            });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao remover arquivo',
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Arquivo muito grande. Máximo permitido: 5MB',
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }

    next();
});

module.exports = router;

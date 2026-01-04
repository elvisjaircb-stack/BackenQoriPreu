import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔴 ANTES (Estaba mal para tu estructura):
// const uploadDir = path.join(__dirname, '../../uploads'); 

// 🟢 CORRECCIÓN (Solo subimos un nivel):
const uploadDir = path.join(__dirname, '../uploads'); 

// ... el resto del código sigue igual ...
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'material-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// ... resto del filtro y export ...
const fileFilter = (req, file, cb) => {
    // ... (tu código de filtro)
    const allowedTypes = /pdf|doc|docx|ppt|pptx|jpg|jpeg|png|mp4/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) return cb(null, true);
    cb(new Error('Tipo de archivo no soportado.'));
};

export const upload = multer({ 
    storage: storage, 
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } 
});
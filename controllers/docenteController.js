import { 
    getCursosDocenteByDni, 
    getCursoDocenteById, 
    insertMaterial, 
    updateLinkCurso 
} from '../models/docenteModel.mjs';

export const getMisCursos = async (req, res) => {
    try {
        const { id: dni } = req.user; 
        const cursos = await getCursosDocenteByDni(dni);
        res.json({ success: true, data: cursos });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCursoDetalle = async (req, res) => {
    try {
        const { id: dni } = req.user;
        const { idCurso } = req.params;
        const data = await getCursoDocenteById(dni, idCurso);
        res.json({ success: true, data });
    } catch (error) {
        res.status(403).json({ success: false, message: error.message });
    }
};

export const subirMaterial = async (req, res) => {
    try {
        const { idCurso } = req.params;
        const { nombre } = req.body;
        
        if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo' });

        // Determinar tipo basado en extensión o mimetype
        const tipo = req.file.mimetype.includes('pdf') ? 'pdf' : 
                     req.file.mimetype.includes('presentation') ? 'ppt' : 'otro';
        
        // URL relativa para guardar en BD
        const url = `/uploads/${req.file.filename}`;

        await insertMaterial(idCurso, tipo, url, nombre || req.file.originalname);
        res.json({ success: true, message: 'Material subido con éxito' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const actualizarLink = async (req, res) => {
    try {
        const { idCurso } = req.params;
        const { link } = req.body;
        await updateLinkCurso(idCurso, link);
        res.json({ success: true, message: 'Enlace actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
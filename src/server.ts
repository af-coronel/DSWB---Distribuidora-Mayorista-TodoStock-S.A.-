import express, { Request, Response } from 'express';

const app = express ();
const PORT = process.env.PORT || 3000;

// Middleware para leer JSON
app.use(express.json)

// Ruta de prueba
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'success',
        message: 'Servidor de TodoStock S.A. funcionando correctamente.',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
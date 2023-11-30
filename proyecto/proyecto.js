const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const swaggerJSDOC = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

const db = new sqlite3.Database('proyectos.db');
const uploadFolder = './uploads';

// Verifica si la carpeta no existe y la crea
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
  console.log('Carpeta "uploads" creada exitosamente.');
} else {
  console.log('La carpeta "uploads" ya existe.');
}

const upload = multer({ dest: 'uploads/' }); // Define la carpeta donde se guardarán las fotos

// Crear tabla si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS proyectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    fecha TEXT,
    usuario TEXT,
    notas TEXT,
    estado TEXT,
    foto TEXT
  )
`);

app.use(express.json());

// Obtener todos los proyectos o filtrar por estado
app.get('/proyectos', (req, res) => {
  const { estado } = req.query;
  let query = 'SELECT * FROM proyectos';

  if (estado && (estado !== 'pendiente' && estado !== 'en progreso' && estado !== 'completado')) {
    return res.status(400).send('El parámetro estado es inválido');
  }

  if (estado) {
    query += ` WHERE estado = '${estado}'`;
  }

  db.all(query, (err, proyectos) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error en el servidor');
    } else {
      res.json(proyectos);
    }
  });
});

// Agregar un nuevo proyecto con foto
app.post('/proyectos', upload.single('foto'), (req, res) => {
  const { nombre, fecha, usuario, notas, estado } = req.body;
  const foto = req.file ? req.file.path : null; // Obtiene la ruta del archivo subido

  if (!nombre || !fecha || !usuario || !estado) {
    return res.status(400).send('Se requieren nombre, fecha, usuario y estado para agregar un proyecto');
  }

  db.run(
    'INSERT INTO proyectos (nombre, fecha, usuario, notas, estado, foto) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, fecha, usuario, notas, estado, foto],
    (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error al agregar un proyecto');
      } else {
        res.send('Proyecto agregado correctamente');
      }
    }
  );
});

// Middleware para manejar datos de formularios
app.use(express.urlencoded({ extended: true }));

// Actualizar un proyecto existente por su ID
app.put('/proyectos/:id', upload.single('foto'), (req, res) => {
  const { id } = req.params;
  const { nombre, fecha, usuario, notas, estado } = req.body;
  const foto = req.file ? req.file.path : null; // Obtiene la ruta del archivo subido

  if (!nombre && !fecha && !usuario && !notas && !estado && !foto) {
    return res.status(400).send('Se requiere al menos un campo para actualizar');
  }

  const updateFields = [];
  const values = [];

  if (nombre) {
    updateFields.push('nombre = ?');
    values.push(nombre);
  }

  if (fecha) {
    updateFields.push('fecha = ?');
    values.push(fecha);
  }

  if (usuario) {
    updateFields.push('usuario = ?');
    values.push(usuario);
  }

  if (notas) {
    updateFields.push('notas = ?');
    values.push(notas);
  }

  if (estado) {
    updateFields.push('estado = ?');
    values.push(estado);
  }

  if (foto) {
    updateFields.push('foto = ?');
    values.push(foto);
  }

  values.push(id);

  db.run(
    `UPDATE proyectos SET ${updateFields.join(', ')} WHERE id = ?`,
    values,
    (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error al actualizar el proyecto');
      } else {
        res.send('Proyecto actualizado correctamente');
      }
    }
  );
});

// Eliminar un proyecto por su ID
app.delete('/proyectos/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM proyectos WHERE id = ?', id, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al eliminar el proyecto');
    } else {
      res.send('Proyecto eliminado correctamente');
    }
  });
});

// Swagger configuration
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Proyectos',
      version: '1.0.0',
      description: 'API para gestionar proyectos',
    },
  },
  apis: ['./app.js'], // Point to the file containing your API routes
};

const swaggerSpec = swaggerJSDOC(options);

const swaggerDocs = () => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

swaggerDocs();

app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port}`);
});

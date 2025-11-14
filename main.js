// main.js

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb'); // Necesitamos ObjectId para buscar por ID
const app = express();
const puerto = 3000;

// Middleware para que Express pueda leer JSON en las peticiones (el cuerpo)
app.use(express.json());

// ----------------------------------------------------
// // CONFIGURACION DE MONGO
// ----------------------------------------------------

const uriMongo = "mongodb://localhost:27017";
const nombreBaseDeDatos = "gestionGruposUsuarios";
let coleccionUsuarios; // Aquí guardamos la referencia a la colección de Usuarios
let coleccionGrupos;   // Aquí guardamos la referencia a la colección de Grupos

/**
 * Función para conectar a MongoDB
 * @returns {Promise<void>}
 */
async function conectarMongo() {
    try {
        // Estableciendo la conexión, parce
        const clienteMongo = new MongoClient(uriMongo);
        await clienteMongo.connect();
        
        // Ya conectados, seleccionamos la base de datos
        const db = clienteMongo.db(nombreBaseDeDatos);

        // Referencias a las colecciones
        coleccionUsuarios = db.collection('usuarios');
        coleccionGrupos = db.collection('grupos');
        
        console.log("¡Qué chimba! Conexión a MongoDB exitosa.");

        // Después de conectar, iniciamos el servidor de Express
        app.listen(puerto, () => {
            console.log(`El servidor está corriendo en http://localhost:${puerto}`);
        });

    } catch (error) {
        console.error("¡Uyyy! Falló la conexión a MongoDB:", error);
        // Si no conecta, es mejor que la aplicación se caiga o no inicie
        process.exit(1); 
    }
}

// Llamamos a la función para conectar e iniciar
conectarMongo();

// ----------------------------------------------------
// // RUTAS DE LA API - GESTION DE USUARIOS
// ----------------------------------------------------

// CREAR un nuevo usuario (POST)
app.post('/usuarios', async (req, res) => {
    // Los datos del usuario vienen en el cuerpo de la petición
    const nuevoUsuario = req.body; 
    
    // Validando que al menos tenga los datos esenciales, ome
    if (!nuevoUsuario.nombre || !nuevoUsuario.apellido || !nuevoUsuario.telefono || !nuevoUsuario.edad) {
        return res.status(400).send({ mensaje: "Faltan datos esenciales del usuario (nombre, apellido, telefono, edad)." });
    }

    try {
        // Insertamos el usuario en la colección
        const resultado = await coleccionUsuarios.insertOne(nuevoUsuario);
        // Devolvemos el usuario creado con el ID que le puso Mongo
        res.status(201).send({ 
            _id: resultado.insertedId, 
            ...nuevoUsuario 
        });

    } catch (error) {
        // Por si algo sale mal al guardar
        res.status(500).send({ mensaje: "Error al crear el usuario.", detalle: error.message });
    }
});

// OBTENER todos los usuarios (GET)
app.get('/usuarios', async (req, res) => {
    try {
        // Buscamos todos los documentos en la colección
        const usuarios = await coleccionUsuarios.find({}).toArray();
        res.status(200).send(usuarios);
    } catch (error) {
        res.status(500).send({ mensaje: "Error al obtener los usuarios.", detalle: error.message });
    }
});

// OBTENER un usuario por ID (GET)
app.get('/usuarios/:id', async (req, res) => {
    const idUsuario = req.params.id;

    try {
        // Hay que convertir el string del ID a un objeto ObjectId de Mongo, sino no busca
        const usuario = await coleccionUsuarios.findOne({ _id: new ObjectId(idUsuario) });

        if (!usuario) {
            return res.status(404).send({ mensaje: "Usuario no encontrado." });
        }
        res.status(200).send(usuario);
    } catch (error) {
        // Si el ID tiene un formato incorrecto (ej: no es una cadena de 24 caracteres)
        res.status(400).send({ mensaje: "ID de usuario inválido.", detalle: error.message });
    }
});


// EDITAR/ACTUALIZAR un usuario (PUT)
app.put('/usuarios/:id', async (req, res) => {
    const idUsuario = req.params.id;
    const datosNuevos = req.body; // Los datos a actualizar

    try {
        const resultado = await coleccionUsuarios.updateOne(
            { _id: new ObjectId(idUsuario) },
            { $set: datosNuevos } // $set actualiza solo los campos que vengan en datosNuevos
        );

        if (resultado.matchedCount === 0) {
            return res.status(404).send({ mensaje: "Usuario no encontrado para actualizar." });
        }
        
        // Si actualizó, devolvemos el usuario actualizado
        const usuarioActualizado = await coleccionUsuarios.findOne({ _id: new ObjectId(idUsuario) });
        res.status(200).send(usuarioActualizado);

    } catch (error) {
        res.status(400).send({ mensaje: "Error al actualizar el usuario.", detalle: error.message });
    }
});

// ELIMINAR un usuario (DELETE)
app.delete('/usuarios/:id', async (req, res) => {
    const idUsuario = req.params.id;

    try {
        const resultado = await coleccionUsuarios.deleteOne({ _id: new ObjectId(idUsuario) });

        if (resultado.deletedCount === 0) {
            return res.status(404).send({ mensaje: "Usuario no encontrado para eliminar." });
        }
        // Devolvemos una respuesta sin contenido, pues ya se eliminó
        res.status(204).send(); 

    } catch (error) {
        res.status(400).send({ mensaje: "Error al eliminar el usuario.", detalle: error.message });
    }
});


// ----------------------------------------------------
// // RUTAS DE LA API - GESTION DE GRUPOS (Simple)
// ----------------------------------------------------
// Un grupo tiene: nombreGrupo, y un array llamado "integrantes" con IDs de usuario.

// CREAR un nuevo grupo (POST)
app.post('/grupos', async (req, res) => {
    const nuevoGrupo = req.body;
    
    if (!nuevoGrupo.nombreGrupo) {
        return res.status(400).send({ mensaje: "Falta el nombre del grupo." });
    }

    // Aseguramos que 'integrantes' sea un array (vacío si no viene)
    nuevoGrupo.integrantes = Array.isArray(nuevoGrupo.integrantes) ? nuevoGrupo.integrantes : [];

    try {
        const resultado = await coleccionGrupos.insertOne(nuevoGrupo);
        res.status(201).send({ _id: resultado.insertedId, ...nuevoGrupo });
    } catch (error) {
        res.status(500).send({ mensaje: "Error al crear el grupo.", detalle: error.message });
    }
});

// OBTENER todos los grupos (GET)
app.get('/grupos', async (req, res) => {
    try {
        const grupos = await coleccionGrupos.find({}).toArray();
        res.status(200).send(grupos);
    } catch (error) {
        res.status(500).send({ mensaje: "Error al obtener los grupos.", detalle: error.message });
    }
});

// OBTENER un grupo por ID (GET)
app.get('/grupos/:id', async (req, res) => {
    const idGrupo = req.params.id;

    try {
        const grupo = await coleccionGrupos.findOne({ _id: new ObjectId(idGrupo) });

        if (!grupo) {
            return res.status(404).send({ mensaje: "Grupo no encontrado." });
        }
        res.status(200).send(grupo);
    } catch (error) {
        res.status(400).send({ mensaje: "ID de grupo inválido.", detalle: error.message });
    }
});

// ELIMINAR un grupo (DELETE)
app.delete('/grupos/:id', async (req, res) => {
    const idGrupo = req.params.id;

    try {
        const resultado = await coleccionGrupos.deleteOne({ _id: new ObjectId(idGrupo) });

        if (resultado.deletedCount === 0) {
            return res.status(404).send({ mensaje: "Grupo no encontrado para eliminar." });
        }
        res.status(204).send();
    } catch (error) {
        res.status(400).send({ mensaje: "Error al eliminar el grupo.", detalle: error.message });
    }
});

// ----------------------------------------------------
// // RUTA EXTRA: Agregar un usuario a un grupo
// ----------------------------------------------------

app.post('/grupos/:idGrupo/agregar-usuario', async (req, res) => {
    const idGrupo = req.params.idGrupo;
    const { idUsuario } = req.body; // El ID del usuario que vamos a meter

    if (!idUsuario) {
        return res.status(400).send({ mensaje: "Se necesita el 'idUsuario' en el cuerpo de la petición." });
    }

    try {
        // Encontramos el grupo y le añadimos el ID del usuario al array 'integrantes'
        const resultado = await coleccionGrupos.updateOne(
            { _id: new ObjectId(idGrupo) },
            { $addToSet: { integrantes: idUsuario } } // $addToSet previene duplicados
        );

        if (resultado.matchedCount === 0) {
            return res.status(404).send({ mensaje: "Grupo no encontrado." });
        }
        
        res.status(200).send({ mensaje: "Usuario agregado al grupo con éxito, ¡papi!" });

    } catch (error) {
        res.status(400).send({ mensaje: "Error al agregar usuario al grupo.", detalle: error.message });
    }
});
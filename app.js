const { createBot, createProvider, createFlow, addKeyword,EVENTS } = require('@bot-whatsapp/bot')

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const mysql = require('mysql2/promise');
//const { getWAUploadToServer } = require('@whiskeysockets/baileys');

const MYSQL_DB_HOST = 'localhost';
const MYSQL_DB_USER = 'root';
const MYSQL_DB_PASSWORD = '';
const MYSQL_DB_NAME = 'prevenir';
const MYSQL_DB_PORT = '3306';

const flowSecundario = addKeyword(['chao', 'siguiente']).addAnswer(['📄 Aquí tenemos el flujo secundario'])

const flowRedes = addKeyword(['redes']).addAnswer(
    [
        '🙌 Estas son nuestras redes sociales.',
        '*Facebook:* facebook.com ',
        '*Instagram:* instagram.com',
        '*Tik tok:* tiktok.com'
    ],
    null,
    null,
    [flowSecundario]
)

const flowInfo = addKeyword(['info']).addAnswer(
    [
        '🚀 En este flujo se mostrara la informacion necesaria de nuestra app'
    ],
    null,
    null,
    [flowSecundario]
)

const flowCitas = addKeyword(['citas',]).addAnswer(
    ['🤪 Aqui encontraras informacion sobre las citas medicas'],
    null,
    null,
    [flowSecundario]
)
const flowBienvenido = addKeyword(['##_bienvenido_##',]).addAnswer(
  ['🤪 Aqui encontraras informacion sobre las citas medicas'],
  null,
  null,
  [flowSecundario]
)

async function DatosBD() {
    // Conecta a la base de datos MySQL
    const connection = await mysql.createConnection({
      host: MYSQL_DB_HOST,
      user: MYSQL_DB_USER,
      password: MYSQL_DB_PASSWORD,
      database: MYSQL_DB_NAME,
      port: MYSQL_DB_PORT,
    });
  
    try {
      // Ejecuta una consulta SQL para obtener los datos de la tabla 'tesisProgramadas'
      const [rows, fields] = await connection.execute('SELECT * FROM usuarios');
      return rows;
    } catch (error) {
      console.error(error);
    } finally {
      // Cierra la conexión a la base de datos MySQL
      connection.close();
    }
  }
  
const flowDatosBD = addKeyword(['datos'])
.addAnswer('Estos son los datos de la BD:')
.addAction(async (ctx, {flowDynamic}) => {
    const data = await DatosBD();
    let message = '';
    for (let i = 0; i < data.length; i++) {
    const {identificacion, nombres, apellidos, tipoAfiliacion, telefono} = data[i];
    message += `*identificacion:* ${identificacion}\n*nombres:* ${nombres}\n*apellidos:* ${apellidos}\n*tipoAfiliacion:* ${tipoAfiliacion}\n*telefono:* ${telefono}\n\n`;
    }
    return flowDynamic(message);
})
  

async function validarIdentificacion(identificacion) {
    console.log('Validando identificación:', identificacion);
  // Conexión a la base de datos
    const connection = await mysql.createConnection({
      host: MYSQL_DB_HOST,
      user: MYSQL_DB_USER,
      password: MYSQL_DB_PASSWORD,
      database: MYSQL_DB_NAME,
      port : MYSQL_DB_PORT
    });
  
    try {
      // Ejecutar la consulta
      const query = `SELECT identificacion FROM usuarios WHERE identificacion = '${identificacion}'`;
      const [rows, fields] = await connection.query(query);      

      
      // Procesar los resultados
      const usuariosValidos = rows.map(row => row.identificacion);
      console.log('Usuarios válidos:', usuariosValidos);
  
      return usuariosValidos;
  
    } catch (error) {
      console.error(error);
      throw new Error('Error al obtener los usuarios válidos');
    } finally {
      console.log('Cerrando conexión a la base de datos');
      // Cerrar la conexión a la base de datos
      connection.end();
    }
  }
  
  let fallBackCount=0;

const flowRegistrados = addKeyword('##_flow_registrados_##')
    .addAnswer('🥳 Tu numero de telefono se encuentra registrado!!! ')
    .addAnswer("Digita la identificacion de la Persona para la que quieres solicitar un servicio",{capture:true},async(ctx,{fallBack, endFlow})=>{
        try {
          console.log('Capturado:', ctx.body)
            const usuariosValidos = await validarIdentificacion(ctx.body);
            if (usuariosValidos.includes(ctx.body)) {
              console.log('Usuario válido:', ctx.body);
      
            } else {
              throw new Error('Usuario no encontrado');
            }
          } catch (error) {
            console.error(error);
            // Envío de notificación si se retorna fallBack 3 veces
            fallBackCount++;
            if (fallBackCount === 3) {
              console.log('Fin del flujo por fallBack');
              return endFlow({body:'Usuario no encontrado. Chat Bot finalizado, nos vemos luego. 👋🤓'});
              // Código para enviar la notificación
            } else {
              fallBack();
            }
          }
    })
    .addAnswer("Bienvenido");

const flowNoEncontrado = addKeyword('##_flow_no_encontrado_##')
.addAnswer('Tu numero de telefono no se encuentra registrado')
.addAnswer(['*1.* Deseas validar el usuario por identificacion (C.C, T.I, C.E)', '*2.* Eres un usuario nuevo'])


// Initial flow where the user can type any word, character or emoji to start saybot.
const flowPrincipal = addKeyword([EVENTS.WELCOME])
    .addAnswer('🙌 Hola bienvenido, mi nombre es *SayBot*, chatbot de *descuentos medicos*')
    .addAnswer('Estamos validando tus datos *...*')
    .addAnswer('🕑',{delay:2000}, async(ctx,{gotoFlow})=>{
        const userPhoneNumber = ctx.from; // Número de teléfono del remitente
        
        // Conexión a la base de datos
        const connection = await mysql.createConnection({
            host: MYSQL_DB_HOST,
            user: MYSQL_DB_USER,
            password: MYSQL_DB_PASSWORD,
            database: MYSQL_DB_NAME,
            port: MYSQL_DB_PORT
        });

        try {
            // Consulta para obtener los números de teléfono registrados
            const query = `SELECT telefono FROM usuarios`;
            const [rows, fields] = await connection.query(query);
            
            const registeredPhoneNumbers = rows.map(row => row.telefono);

            // Verificar si el número de teléfono del remitente está registrado
            if (registeredPhoneNumbers.includes(userPhoneNumber)) {
                gotoFlow(flowRegistrados);
            } else {
                gotoFlow(flowNoEncontrado);
            }
        } catch (error) {
            console.error(error);
            // Manejar el error aquí
        } finally {
            // Cerrar la conexión a la base de datos
            connection.end();
        }
    })


const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal,flowCitas,flowInfo,flowRedes,flowBienvenido,flowDatosBD])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

main()

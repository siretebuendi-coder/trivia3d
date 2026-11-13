// Minijuegos de pareja. Puedes añadir más copiando una línea.

// "Coincidir / No coincidir": los dos eligen en secreto una opción del mismo tema.
// [tema, [opciones...]]
export const TOPICS = [
  ['Una marca de coche', ['Seat', 'BMW', 'Audi', 'Mercedes', 'Toyota', 'Tesla', 'Ford', 'Renault']],
  ['Un sabor de helado', ['Chocolate', 'Fresa', 'Vainilla', 'Pistacho', 'Limón', 'Stracciatella', 'Dulce de leche', 'Cookies']],
  ['Un destino de vacaciones', ['Playa en España', 'Nueva York', 'Japón', 'Italia', 'Tailandia', 'Canarias', 'Parque temático', 'Montaña']],
  ['Un color', ['Rojo', 'Azul', 'Verde', 'Amarillo', 'Negro', 'Rosa', 'Morado', 'Naranja']],
  ['Un animal', ['Perro', 'Gato', 'León', 'Delfín', 'Águila', 'Panda', 'Lobo', 'Pulpo']],
  ['Una comida rápida', ['Pizza', 'Hamburguesa', 'Kebab', 'Tacos', 'Sushi', 'Pollo frito', 'Bocadillo', 'Pasta']],
  ['Un superpoder', ['Volar', 'Invisibilidad', 'Leer mentes', 'Teletransporte', 'Superfuerza', 'Parar el tiempo', 'Hablar con animales', 'Ser inmortal']],
  ['Un deporte', ['Fútbol', 'Baloncesto', 'Tenis', 'Natación', 'Pádel', 'Gimnasio', 'Ciclismo', 'Running']],
  ['Una fruta', ['Manzana', 'Plátano', 'Fresa', 'Sandía', 'Mango', 'Uvas', 'Piña', 'Melocotón']],
  ['Una red social', ['Instagram', 'TikTok', 'WhatsApp', 'YouTube', 'X (Twitter)', 'Snapchat', 'Twitch', 'Pinterest']],
  ['Una ciudad española', ['Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Málaga', 'Bilbao', 'Granada', 'Palma']],
  ['Un instrumento musical', ['Guitarra', 'Piano', 'Batería', 'Violín', 'Flauta', 'Trompeta', 'Bajo', 'Saxofón']],
  ['Un plato español', ['Paella', 'Tortilla de patatas', 'Jamón', 'Croquetas', 'Gazpacho', 'Cocido', 'Patatas bravas', 'Calamares']],
  ['Una bebida', ['Coca-Cola', 'Cerveza', 'Agua', 'Zumo', 'Café', 'Té', 'Batido', 'Limonada']],
  ['Un género de película', ['Comedia', 'Terror', 'Acción', 'Romance', 'Ciencia ficción', 'Animación', 'Misterio', 'Fantasía']],
  ['Una asignatura del cole', ['Matemáticas', 'Lengua', 'Historia', 'Educación física', 'Inglés', 'Dibujo', 'Música', 'Ciencias']],
  ['Un videojuego', ['Minecraft', 'FIFA / FC', 'Fortnite', 'Mario Kart', 'Zelda', 'GTA', 'Los Sims', 'Pokémon']],
  ['Un mes del año', ['Enero', 'Marzo', 'Mayo', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Diciembre']],
];

// "¿Quién conoce más a quién?": {A} responde sobre sí mismo/a y su pareja intenta adivinarlo.
// [pregunta, [4 opciones]]
export const GUESS = [
  ['¿Qué prefiere {A} para cenar?', ['Pizza', 'Sushi', 'Hamburguesa', 'Pasta']],
  ['¿Cómo es el plan perfecto de {A} un sábado?', ['Sofá y serie', 'Salir de fiesta', 'Excursión', 'Comida con amigos']],
  ['Si {A} ganase la lotería, ¿qué haría primero?', ['Viajar por el mundo', 'Comprar una casa', 'Ahorrarlo', 'Montar un negocio']],
  ['¿Qué haría {A} si le dan el plato equivocado en un restaurante?', ['Se lo come igual', 'Avisa con educación', 'Se queja bastante', 'Pide el cambio sin decir nada']],
  ['¿Cómo reaccionaría {A} si ve una araña enorme en casa?', ['Grita y huye', 'La mata', 'La saca con un vaso', 'Llama a alguien']],
  ['¿Qué hace {A} cuando llega tarde a una quedada?', ['Avisa por WhatsApp', 'Corre y llega sudando', 'Inventa una excusa', 'Nunca llega tarde']],
  ['¿Qué haría {A} si encuentra una cartera con 200 € en la calle?', ['La entrega en comisaría', 'Busca al dueño', 'Se queda el dinero', 'Hace una donación']],
  ['¿Cómo se despierta {A} por la mañana?', ['A la primera alarma', 'Con cinco alarmas', 'Antes de la alarma', 'Hay que sacarlo de la cama']],
  ['¿Qué haría {A} en una isla desierta?', ['Construir un refugio', 'Pescar y cocinar', 'Esperar rescate en la playa', 'Explorar toda la isla']],
  ['¿Qué serie vería {A} de maratón?', ['Comedia', 'Crimen / Thriller', 'Fantasía', 'Reality shows']],
  ['¿Cuál es el mayor miedo de {A}?', ['Las alturas', 'Los bichos', 'La oscuridad', 'Hablar en público']],
  ['¿Con qué personaje se identifica más {A}?', ['El líder', 'El gracioso', 'El cerebrito', 'El aventurero']],
  ['¿Qué haría {A} si le tocase un día entero sin móvil?', ['Se agobiaría', 'Saldría a pasear', 'Dormiría', 'Quedaría con alguien']],
  ['¿Qué superpoder elegiría {A}?', ['Volar', 'Invisibilidad', 'Parar el tiempo', 'Leer mentes']],
  ['¿Cómo organiza {A} su habitación?', ['Todo ordenadísimo', 'Caos organizado', 'Un desastre', 'Lo recoge solo cuando hay visita']],
  ['¿Qué pediría {A} de postre?', ['Tarta de queso', 'Helado', 'Fruta', 'Nada, no le gusta el dulce']],
  ['¿Qué haría {A} si se queda sin batería fuera de casa?', ['Pide un cargador', 'Busca un enchufe', 'Se lo toma con calma', 'Entra en pánico']],
  ['¿Qué haría {A} si se queda encerrado/a en un ascensor?', ['Pulsar la alarma', 'Llamar por teléfono', 'Gritar', 'Esperar con calma']],
];

// Cosas para dibujar: objetos con algo de dificultad, acciones y escenas sencillas
export const DRAW = [
  // acciones y escenas
  'Un niño corriendo', 'Un perro persiguiendo una pelota', 'Alguien durmiendo', 'Una persona bailando', 'Un gato subido a un árbol',
  'Un pájaro comiendo un gusano', 'Alguien cocinando', 'Un niño montando en bici', 'Un surfista en una ola', 'Un astronauta flotando',
  'Alguien lavándose los dientes', 'Un pescador pescando', 'Un fantasma asustando a alguien', 'Una persona esquiando', 'Un payaso haciendo malabares',
  'Un bebé gateando', 'Alguien paseando al perro', 'Un tiburón persiguiendo a un nadador', 'Un mago sacando un conejo del sombrero', 'Dos personas dándose la mano',
  'Alguien estornudando', 'Un chico jugando al fútbol', 'Una abuela tejiendo', 'Un pirata buscando un tesoro', 'Alguien subiendo una montaña',
  'Un cocodrilo con la boca abierta', 'Una sirena nadando', 'Un niño soplando las velas', 'Alguien hablando por teléfono', 'Un conductor atascado en un atasco',
  'Una persona tomando el sol en la playa', 'Un caballo saltando una valla', 'Un robot bailando', 'Un lobo aullando a la luna', 'Alguien leyendo un libro',
  // cosas y animales con algo más de detalle
  'Tiburón', 'Pulpo', 'Jirafa', 'Pingüino', 'Camaleón', 'Murciélago', 'Flamenco',
  'Camión de bomberos', 'Globo aerostático', 'Submarino', 'Faro', 'Molino', 'Noria', 'Montaña rusa',
  'Torre Eiffel', 'Pirámide', 'Coliseo', 'Estatua de la Libertad', 'Gran Muralla',
  'Bruja en escoba', 'Dragón', 'Unicornio', 'Zombi', 'Sirena', 'Castillo con puente', 'Tienda de campaña',
  'Spider-Man', 'Mickey Mouse', 'Shrek', 'Bob Esponja', 'Pikachu', 'Harry Potter', 'Elsa de Frozen', 'Mario Bros',
  'Reloj de arena', 'Paraguas roto', 'Bicicleta', 'Guitarra eléctrica', 'Cámara de fotos', 'Cohete despegando',
  'Un bocadillo gigante', 'Una pizza con muchos ingredientes', 'Un helado derritiéndose', 'Una tormenta con rayos', 'Un arcoíris con lluvia',
];

// Dibujo A CIEGAS (con los ojos cerrados): cosas muy fáciles y de formas sencillas
export const BLIND = [
  'Casa', 'Sol', 'Corazón', 'Estrella', 'Árbol', 'Pez', 'Gato', 'Flor', 'Coche', 'Barco',
  'Luna', 'Cara sonriente', 'Avión', 'Bicicleta', 'Nube con lluvia', 'Mesa', 'Silla', 'Pájaro', 'Manzana', 'Pelota',
  'Paraguas', 'Montaña', 'Serpiente', 'Cohete', 'Gafas', 'Reloj', 'Llave', 'Corona', 'Pingüino', 'Mariposa',
  'Tren', 'Sombrero', 'Cangrejo', 'Bandera', 'Vaso', 'Tortuga', 'Zapato', 'Taza', 'Helado', 'Elefante',
];

// Mímica (sin hablar ni hacer sonidos): acciones, animales, oficios y personajes
export const MIME = [
  'Un mono comiendo un plátano', 'Un cocinero quemando la comida', 'Un futbolista fallando un penalti', 'Un dentista', 'Un robot sin pilas',
  'Una gallina', 'Un surfista', 'Un astronauta caminando por la Luna', 'Un ladrón de puntillas', 'Un bebé llorando',
  'Un camarero con muchas bandejas', 'Alguien atrapado en un ascensor', 'Un profesor enfadado', 'Un pirata', 'Un zombi',
  'Un gato persiguiendo un ratón', 'Un pingüino caminando', 'Alguien que se ha quedado sin cobertura', 'Un boxeador', 'Una cantante en un concierto',
  'Un esquiador cayéndose', 'Un fotógrafo', 'Un guitarrista rockero', 'Un mago', 'Un cowboy a caballo',
  'Un elefante bebiendo con la trompa', 'Un levantador de pesas', 'Una bailarina de ballet', 'Un policía dirigiendo el tráfico', 'Alguien comiendo un helado que se derrite',
  'Un nadador', 'Un payaso', 'Un gorila', 'Alguien jugando al tenis', 'Un dormilón que no oye el despertador',
  'Un conductor de coche', 'Un director de orquesta', 'Un tiburón', 'Un ciclista subiendo una cuesta', 'Alguien que se ha pillado el dedo con la puerta',
  'Spider-Man', 'Harry Potter lanzando un hechizo', 'Elsa de Frozen', 'Mario saltando', 'Shrek',
];

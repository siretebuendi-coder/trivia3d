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

// Palabras para dibujar (solo las ven los rivales)
export const DRAW = [
  'Tiburón', 'Paraguas', 'Bicicleta', 'Pizza', 'Castillo', 'Torre Eiffel', 'Guitarra', 'Dinosaurio', 'Astronauta', 'Cohete',
  'Gafas de sol', 'Elefante', 'Helado', 'Mariposa', 'Dragón', 'Pirata', 'Zombi', 'Sirena', 'Robot', 'Volcán',
  'Camión de bomberos', 'Tobogán', 'Pulpo', 'Gato con botas', 'Muñeco de nieve', 'Árbol de Navidad', 'Corona', 'Faro', 'Submarino', 'Globo aerostático',
  'Mago', 'Fantasma', 'Cangrejo', 'Jirafa', 'Hamburguesa', 'Palmera', 'Reloj', 'Ordenador', 'Avión', 'Tren',
  'Pingüino', 'Ballena', 'Tortuga', 'Murciélago', 'Araña', 'Cactus', 'Caravana', 'Tienda de campaña', 'Iglú', 'Molino',
  'Mochila', 'Cámara de fotos', 'Micrófono', 'Corazón', 'Llave', 'Candado', 'Tijeras', 'Zapatilla', 'Sombrero', 'Bufanda',
  'Cohete espacial', 'Estrella de mar', 'Cocodrilo', 'Mono', 'Loro', 'Búho', 'Unicornio', 'Hada', 'Esqueleto', 'Calabaza de Halloween',
  'Patinete', 'Monopatín', 'Portería de fútbol', 'Piscina', 'Noria', 'Montaña rusa', 'Playa', 'Sandía', 'Cerveza', 'Tarta de cumpleaños',
  'Móvil', 'Auriculares', 'Mando de videojuegos', 'Bruja', 'Espada', 'Escudo', 'Arcoíris', 'Tormenta', 'Luna', 'Sol con gafas',
  'Spider-Man', 'Cenicienta', 'Bob Esponja', 'Shrek', 'Pikachu', 'Mickey Mouse', 'Harry Potter', 'Elsa', 'Mario Bros', 'Doraemon',
];

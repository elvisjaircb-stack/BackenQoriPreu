import bcrypt from 'bcryptjs';

const password = 'admin123'; // la contraseña que quieres para el admin

const hashedPassword = await bcrypt.hash(password, 10);
console.log(hashedPassword);

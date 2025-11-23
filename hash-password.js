// hash-password.js
const bcrypt = require('bcrypt');
const password = '123456'; // Ganti dengan password yang kamu inginkan
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error(err);
        return;
    }
    console.log('Password-mu yang sudah di-hash:');
    console.log(hash);
});
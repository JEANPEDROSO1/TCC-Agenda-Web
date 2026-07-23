const pool = require('./db');

async function promote() {
    try {
        await pool.execute("UPDATE usuarios SET role = 'admin' WHERE id_usuario = 1");
        console.log("Usuario ID 1 promovido a admin com sucesso!");
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        process.exit();
    }
}
promote();

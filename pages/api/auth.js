import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { readData, writeData, generateId } from '../../lib/dataManager.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('Peringatan: JWT_SECRET tidak diatur. Menggunakan nilai default yang tidak aman.');
}

// --- MAIN HANDLER ---

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} tidak diizinkan` });
  }

  const { action } = req.body;

  try {
    switch (action) {
      case 'login':
        return await handleLogin(req, res);
      case 'register':
        return await handleRegister(req, res);
      case 'change-password':
        return await handleChangePassword(req, res);
      case 'verify':
        return handleVerify(req, res);
      default:
        return res.status(400).json({ error: 'Action tidak valid.' });
    }
  } catch (error) {
    console.error(`[API/AUTH] Error on action '${action}':`, error);
    return res.status(500).json({ error: 'Terjadi kesalahan internal pada server.', details: error.message });
  }
}

// --- ACTION HANDLERS ---

async function handleLogin(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }

  const data = await readData();
  const user = data.users.find(u => u.username === username);

  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Username atau password salah.' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET || 'default-secret',
    { expiresIn: '24h' }
  );

  return res.status(200).json({
    message: 'Login berhasil.',
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
}

async function handleRegister(req, res) {
  const adminUser = verifyToken(req);
  if (adminUser?.role !== 'admin') {
    return res.status(403).json({ error: 'Hanya admin yang dapat menambah user baru.' });
  }

  const { newUsername, newPassword, newRole = 'staff' } = req.body;
  if (!newUsername || !newPassword) {
    return res.status(400).json({ error: 'Username dan password baru wajib diisi.' });
  }

  const data = await readData();
  if (data.users.some(u => u.username === newUsername)) {
    return res.status(409).json({ error: 'Username sudah digunakan.' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const newUser = {
    id: generateId(data.users),
    username: newUsername,
    password: hashedPassword,
    role: newRole,
    created_at: new Date().toISOString(),
  };

  data.users.push(newUser);
  if (await writeData(data)) {
    return res.status(201).json({ 
      message: 'User berhasil ditambahkan.',
      user: { id: newUser.id, username: newUser.username, role: newUser.role },
    });
  } else {
    return res.status(500).json({ error: 'Gagal menyimpan data user baru.' });
  }
}

async function handleChangePassword(req, res) {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Otentikasi gagal.' });
  }

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Password lama dan baru wajib diisi.' });
  }

  const data = await readData();
  const userToUpdate = data.users.find(u => u.id === user.userId);

  if (!userToUpdate) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  if (!await bcrypt.compare(oldPassword, userToUpdate.password)) {
    return res.status(400).json({ error: 'Password lama salah.' });
  }

  userToUpdate.password = await bcrypt.hash(newPassword, 10);

  if (await writeData(data)) {
    return res.status(200).json({ message: 'Password berhasil diubah.' });
  } else {
    return res.status(500).json({ error: 'Gagal menyimpan perubahan password.' });
  }
}

function handleVerify(req, res) {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Token tidak valid atau tidak ada.' });
  }
  return res.status(200).json({ user });
}

// --- TOKEN VERIFICATION ---

function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET || 'default-secret');
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
}

export { verifyToken };
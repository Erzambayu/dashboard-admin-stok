import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { readData, writeData } from '../../lib/dataManager.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { action, username, password } = req.body;

    if (action === 'login') {
      try {
        const data = await readData();
        const user = data.users.find(u => u.username === username);

        if (!user) {
          return res.status(401).json({ error: 'Username atau password salah' });
        }

        // Verifikasi password dengan bcrypt
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
          return res.status(401).json({ error: 'Username atau password salah' });
        }

        const token = jwt.sign(
          { userId: user.id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.status(200).json({
          message: 'Login berhasil',
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        });
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
      }
    } else if (action === 'register') {
      // Fitur register user baru (hanya admin yang bisa)
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
          return res.status(403).json({ error: 'Hanya admin yang dapat menambah user' });
        }
        
        const { newUsername, newPassword, newRole = 'staff' } = req.body;
        
        if (!newUsername || !newPassword) {
          return res.status(400).json({ error: 'Username dan password wajib diisi' });
        }
        
        const data = await readData();
        
        // Cek apakah username sudah ada
        const existingUser = data.users.find(u => u.username === newUsername);
        if (existingUser) {
          return res.status(400).json({ error: 'Username sudah digunakan' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Tambah user baru
        const newUser = {
          id: data.users.length + 1,
          username: newUsername,
          password: hashedPassword,
          role: newRole,
          created_at: new Date().toISOString()
        };
        
        data.users.push(newUser);
        
        await writeData(data);
        
        res.status(201).json({ 
          message: 'User berhasil ditambahkan',
          user: { id: newUser.id, username: newUser.username, role: newUser.role }
        });
        
      } catch (error) {
        console.error('Register error:', error);
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Token tidak valid' });
        }
        res.status(500).json({ error: 'Server error' });
      }
    } else if (action === 'change-password') {
      // Fitur ganti password
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
          return res.status(400).json({ error: 'Password lama dan baru wajib diisi' });
        }
        
        const data = await readData();
        const userIndex = data.users.findIndex(u => u.id === decoded.userId);
        
        if (userIndex === -1) {
          return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        
        // Verifikasi password lama
        const isOldValid = await bcrypt.compare(oldPassword, data.users[userIndex].password);
        if (!isOldValid) {
          return res.status(400).json({ error: 'Password lama salah' });
        }
        
        // Hash password baru
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        data.users[userIndex].password = hashedNewPassword;
        
        await writeData(data);
        
        res.status(200).json({ message: 'Password berhasil diubah' });
        
      } catch (error) {
        console.error('Change password error:', error);
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Token tidak valid' });
        }
        res.status(500).json({ error: 'Server error' });
      }
    } else if (action === 'verify') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'Token tidak ditemukan' });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.status(200).json({ user: decoded });
      } catch (error) {
        res.status(401).json({ error: 'Token tidak valid' });
      }
    } else {
      res.status(400).json({ error: 'Action tidak valid' });
    }
  } else {
    res.status(405).json({ error: 'Method tidak diizinkan' });
  }
}

// Middleware untuk verifikasi token
function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('Token tidak ditemukan');
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Token tidak valid');
  }
}

export { verifyToken };
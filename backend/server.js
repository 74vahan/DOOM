// ============================================================
// server.js — главный файл бэкенда.
// Делает две вещи:
//   1) отдаёт статику игры (папка ../game)
//   2) API рекордов: POST /api/scores и GET /api/scores/top
// ============================================================

require('dotenv').config();
const path = require('path');
const express = require('express');
const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Разбор JSON в теле запросов (для POST /api/scores)
app.use(express.json());

// --- Статика: вся папка game отдаётся как сайт ---
app.use(express.static(path.join(__dirname, '..', 'game')));

// --- Сохранить рекорд ---
// Тело запроса: { "name": "PLAYER", "score": 1234 }
app.post('/api/scores', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 16); // максимум 16 символов
    const score = Number(req.body.score);

    // Простая валидация: не сохраняем мусор
    if (!name || !Number.isFinite(score) || score < 0 || score > 1000000) {
      return res.status(400).json({ error: 'Некорректные имя или счёт' });
    }

    // Знак "?" — плейсхолдеры: защита от SQL-инъекций
    await pool.query(
      'INSERT INTO scores (player_name, score) VALUES (?, ?)',
      [name, Math.floor(score)]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Ошибка сохранения рекорда:', err.message);
    res.status(500).json({ error: 'База данных недоступна' });
  }
});

// --- Топ-10 рекордов ---
app.get('/api/scores/top', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT player_name, score, created_at FROM scores ORDER BY score DESC LIMIT 10'
    );
    res.json(rows);
  } catch (err) {
    console.error('Ошибка чтения рекордов:', err.message);
    res.status(500).json({ error: 'База данных недоступна' });
  }
});

// --- Проверка живости (удобно для отладки: curl localhost:3000/health) ---
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Сервер игры запущен: http://localhost:${PORT}`);
});

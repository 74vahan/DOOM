// ============================================================
// score.js — общение с бэкендом: вход/регистрация и рекорды.
// Бэкенд (backend/server.js) хранит всё в MySQL.
// ============================================================

// --- Авторизация ---
const AuthAPI = {
  // Регистрация нового игрока (имя, пароль, возраст).
  // Игроки младше 18 регистрируются в базе, но играть не могут.
  async register(name, password, age) {
    return this._post('/api/register', { name, password, age });
  },

  async login(name, password) {
    return this._post('/api/login', { name, password });
  },

  async _post(url, body) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || `Ошибка ${res.status}` };
      return { ok: true, name: data.name };
    } catch (err) {
      console.error('Auth error:', err.message);
      return { ok: false, error: 'Сервер недоступен' };
    }
  },
};

// --- Рекорды ---
const ScoreAPI = {
  async submit(name, score) {
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.loadTop(); // обновить таблицу — вдруг ты в топе!
    } catch (err) {
      console.error('Не удалось сохранить рекорд:', err.message);
      this.showMessage('Сервер рекордов недоступен :(');
    }
  },

  async loadTop() {
    const box = document.getElementById('highscores');
    try {
      const res = await fetch('/api/scores/top');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();

      if (rows.length === 0) {
        this.showMessage('Рекордов пока нет — будь первым!');
        return;
      }

      // textContent (а не innerHTML) — чтобы имя игрока
      // не могло вставить в страницу вредный HTML
      const table = document.createElement('table');
      rows.forEach((r, i) => {
        const tr = document.createElement('tr');
        const place = document.createElement('td');
        place.textContent = `${i + 1}.`;
        const name = document.createElement('td');
        name.textContent = r.player_name;
        const score = document.createElement('td');
        score.textContent = r.score;
        tr.append(place, name, score);
        table.appendChild(tr);
      });

      box.innerHTML = '<h3>ТОП-10 БОЙЦОВ</h3>';
      box.appendChild(table);
    } catch (err) {
      console.error('Не удалось загрузить рекорды:', err.message);
      this.showMessage('Сервер рекордов недоступен :(');
    }
  },

  showMessage(text) {
    document.getElementById('highscores').textContent = text;
  },
};

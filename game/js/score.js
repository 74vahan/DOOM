// ============================================================
// score.js — общение с бэкендом: сохранить рекорд, получить топ.
// Бэкенд (backend/server.js) хранит рекорды в MySQL.
// ============================================================

const ScoreAPI = {
  // Отправить рекорд на сервер
  async submit(name, score) {
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      UI.hideNameForm();
      this.loadTop(); // обновить таблицу — вдруг ты в топе!
    } catch (err) {
      console.error('Не удалось сохранить рекорд:', err.message);
      this.showMessage('Сервер рекордов недоступен :(');
    }
  },

  // Загрузить топ-10 и показать таблицу
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

      // Собираем таблицу топ-10.
      // textContent (а не innerHTML) — чтобы имя игрока
      // не могло вставить в страницу вредный HTML.
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
    const box = document.getElementById('highscores');
    box.textContent = text;
  },
};

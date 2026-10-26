# Krídla Blenderu — 3D Letecká Hra (Wings of Blender)

Low-poly 3D letecká hra z pohľadu tretej osoby vytvorená v Reacte a Three.js.

---

## 🛠️ Ako vyriešiť 404 na `https://jakubikartificials.github.io/BlenderBaron/`

Chyba 404 nastáva na GitHube z dvoch bežných dôvodov:
1. **GitHub Pages nie je zapnuté na správny zdroj (Source)**, alebo
2. **GitHub Actions workflow zlyhal na chýbajúcom `package-lock.json` / peer dependencies** (tento problém je už v repozitári opravený pridaním `.npmrc`, `package-lock.json`, `.nojekyll` a `404.html`).

---

### Spôsob 1 (Najrýchlejší — cez priečinok `/docs` bez nutnosti čakať na Actions):

1. Uistite sa, že ste nahrali najnovší kód do repozitára vrátane priečinka `docs`:
   ```bash
   git add .
   git commit -m "Fix GitHub Pages 404 and add docs deployment"
   git push origin main
   ```
2. Otvorte Váš repozitár na GitHube: **Settings** → v ľavom menu kliknite na **Pages**.
3. V časti **Build and deployment**:
   - **Source**: vyberte **Deploy from a branch**
   - **Branch**: vyberte **main** (alebo master) a priečinok zmeňte z `/ (root)` na **`/docs`**
   - Kliknite na **Save**.
4. Po 30–60 sekundách obnovte stránku:
   👉 **`https://jakubikartificials.github.io/BlenderBaron/`**

---

### Spôsob 2 (Automatický — cez GitHub Actions):

Ak chcete používať automatický build pri každom `push`:
1. V repozitári na GitHube otvorte: **Settings** → **Actions** → **General**.
2. Prejdite dolu na **Workflow permissions** a označte **"Read and write permissions"** → **Save**.
3. V **Settings** → **Pages**:
   - **Source**: prepnite na **GitHub Actions**.
4. V záložke **Actions** uvidíte zelené fajky pri úspešnom builde.

---

## 🎮 Herné ovládanie

- **Riadenie letu**: Klávesy `↑`, `↓`, `←`, `→` (šípky).
- **Opravy lietadla**:
  - **Level 1**: `Shift + D`, `R`, `G`, `S`
  - **Level 2**: `Esc`, `R + X`, `G + Z`, `S + Shift + Z / X / Y`
  - **Level 3**: `Tab`, `X`, `E + X`, `Shift + V`
  - **Level 4**: `L`, `1 / 2 / 3` (vrátane slovenskej klávesnice `+ / ľ / š`), `M`, `K`

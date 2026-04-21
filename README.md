# MAG//SYS — Serwis Magazynowy

Aplikacja webowa do zarządzania częściami serwisowymi.
Stack: czysty HTML/CSS/JS + Google Sheets jako baza danych.

---

## Pliki

```
index.html       — główna aplikacja
style.css        — style
app.js           — logika aplikacji
apps-script.gs   — backend Google Apps Script
README.md        — ten plik
```

---

## Wdrożenie — krok po kroku

### 1. Google Sheets (backend)

1. Otwórz https://sheets.google.com → utwórz nowy arkusz
2. Menu: **Rozszerzenia → Apps Script**
3. Usuń domyślny kod, wklej zawartość `apps-script.gs`
4. Kliknij **Uruchom → firstSetup()** — tworzy arkusze LOG i STOCK
5. Kliknij **Wdróż → Nowe wdrożenie**
   - Typ: **Aplikacja internetowa**
   - Wykonaj jako: **Ja**
   - Kto ma dostęp: **Wszyscy**
6. Skopiuj URL wdrożenia (wygląda jak: `https://script.google.com/macros/s/AKf.../exec`)

### 2. Aplikacja na GitHub Pages (hosting)

1. Utwórz repozytorium na GitHub (np. `magazyn`)
2. Wrzuć pliki: `index.html`, `style.css`, `app.js`
   (plik `apps-script.gs` i `README.md` możesz też dodać, nie wpływają na działanie)
3. Wejdź w **Settings → Pages → Source: main branch**
4. Aplikacja dostępna pod: `https://TWOJ-LOGIN.github.io/magazyn`

### 3. Połączenie aplikacji z Sheets

1. Otwórz aplikację w przeglądarce
2. Przejdź do zakładki **⚙ USTAWIENIA**
3. Wklej URL wdrożenia z kroku 1.6 w pole **APPS SCRIPT WEBHOOK URL**
4. Kliknij **ZAPISZ POŁĄCZENIE**
5. Wskaźnik w nagłówku zmieni się z "LOKALNIE" na "SHEETS ONLINE"

---

## Jak używać

### Zakładka TRANSAKCJA
- Wybierz akcję (Pobierz / Zwrot / Zepsuta / Wymiana / Przyjęcie / Przegląd)
- Wpisz numer seryjny części, kategorię, imię technika
- Kliknij ZAPISZ

### Zakładka HISTORIA
- Pełna lista transakcji z filtrowaniem
- Eksport do CSV przyciskiem ↓ CSV

### Zakładka MAGAZYN
- Stan części: ile w stocku, ile w urządzeniach, ile zepsutych
- Pasek dostępności dla każdej kategorii

### Zakładka ⚙ USTAWIENIA
- Konfiguracja połączenia z Google Sheets
- Lista techników (autocomplete w formularzu)
- Lista urządzeń/lokalizacji (autocomplete)

---

## Działanie offline

Aplikacja zapisuje dane lokalnie w przeglądarce (localStorage).
Gdy jest skonfigurowany webhook, każda transakcja jest też wysyłana do Google Sheets.
Dane lokalne i arkusz są niezależne — arkusz jest master copy.

---

## Dostosowanie kategorii

Edytuj tablicę `KATEGORIE` w `app.js` i `apps-script.gs` (muszą być identyczne).

## Alerty email

W pliku `apps-script.gs` ustaw:
```js
const ADMIN_EMAIL = "twoj@email.pl";
```
Dostaniesz email gdy stan kategorii spadnie do ≤1 sztuki.

---

## Netlify (alternatywa dla GitHub Pages)

1. Wejdź na https://netlify.com → "Add new site → Deploy manually"
2. Przeciągnij folder z plikami
3. Gotowe — dostaniesz URL w stylu `https://amazing-name-123.netlify.app`

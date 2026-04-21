// ═══════════════════════════════════════════════════════
// MAG//SYS — Google Apps Script backend
// Plik: apps-script.gs
//
// INSTRUKCJA:
// 1. Otwórz Google Sheets → Rozszerzenia → Apps Script
// 2. Wklej cały ten kod, zastępując domyślną funkcję
// 3. Kliknij Wdróż → Nowe wdrożenie → Aplikacja internetowa
//    - Wykonaj jako: Ja (swoje konto)
//    - Kto ma dostęp: Wszyscy
// 4. Skopiuj URL wdrożenia do ustawień aplikacji
// ═══════════════════════════════════════════════════════

const SHEET_LOG   = "LOG";
const SHEET_STOCK = "STOCK";
const ADMIN_EMAIL = ""; // opcjonalnie: Twój email do alertów

const KATEGORIE = [
  "Czytnik kart A900","Czytnik kart A1000","Czytnik kart M1000",
  "Czytnik kodów QR","Drukarka","Drukarka Stelio","Datapack",
  "Ekran monochromatyczny","Kasa pośrednia",
  "Modem","Płyta główna","Płytka zasilająca czytnik",
  "Płytka zasilająca","Płytka do kabli czytnik",
  "Panel górny","Panel dolny A1000","Panel dolny A900",
  "Płytka pośrednia","Rak","Selektor","Zamek",
  "Inne"
];

// ── Obsługa POST (zapis transakcji) ───────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    appendToLog(data);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Obsługa GET (odczyt danych do aplikacji) ──────────
function doGet(e) {
  const action = e.parameter.action || "log";

  if (action === "log") {
    const rows = getLogRows();
    return jsonResponse({ ok: true, data: rows });
  }

  if (action === "stock") {
    const stock = computeStock();
    return jsonResponse({ ok: true, data: stock });
  }

  return jsonResponse({ ok: false, error: "Unknown action" });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Zapis do arkusza LOG ───────────────────────────────
function appendToLog(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_LOG);

  // Nagłówki przy pierwszym uruchomieniu
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["TIMESTAMP","AKCJA","NR_SERYJNY","KATEGORIA","TECHNIK","URZADZENIE","UWAGI","ID"]);
    sheet.getRange(1,1,1,8)
         .setFontWeight("bold")
         .setBackground("#0c0c0c")
         .setFontColor("#f5e642");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 140);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(5, 150);
  }

  sheet.appendRow([
    data.ts     || new Date().toISOString().slice(0,16).replace("T"," "),
    data.akcja  || "",
    data.sn     || "",
    data.kat    || "",
    data.kto    || "",
    data.dev    || "",
    data.note   || "",
    data.id     || Utilities.getUuid().slice(0,8).toUpperCase()
  ]);

  // Koloruj badge akcji
  const lastRow  = sheet.getLastRow();
  const akColors = {
    "POBIERZ":   { bg: "#0d2a2e", fg: "#3dd6f5" },
    "ZWROT":     { bg: "#0d2a1a", fg: "#3dffa0" },
    "ZEPSUTA":   { bg: "#2a0d0d", fg: "#ff4d4d" },
    "WYMIANA":   { bg: "#2a1a0d", fg: "#ff8c42" },
    "PRZYJĘCIE": { bg: "#2a2a0d", fg: "#f5e642" },
    "PRZEGLĄD":  { bg: "#1a0d2a", fg: "#b06eff" }
  };
  const ak = data.akcja;
  if (akColors[ak]) {
    sheet.getRange(lastRow, 2)
         .setBackground(akColors[ak].bg)
         .setFontColor(akColors[ak].fg)
         .setFontWeight("bold");
  }

  // Alert jeśli stan spada
  if (ADMIN_EMAIL && ["POBIERZ","WYMIANA","ZEPSUTA"].includes(ak)) {
    checkAndAlertLowStock(data.kat);
  }
}

// ── Odczyt logów ──────────────────────────────────────
function getLogRows() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_LOG);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  return vals.map(r => ({
    ts:    r[0] instanceof Date ? Utilities.formatDate(r[0], Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm") : r[0],
    akcja: r[1], sn: r[2], kat: r[3],
    kto:   r[4], dev: r[5], note: r[6], id: r[7]
  })).reverse(); // najnowsze pierwsze
}

// ── Oblicz stany magazynowe ────────────────────────────
function computeStock() {
  const rows = getLogRows();
  const snState = {};
  const snKat   = {};

  // Idź od najstarszego do najnowszego — ostatni wpis wygrywa
  [...rows].reverse().forEach(r => {
    snState[r.sn] = r.akcja;
    snKat[r.sn]   = r.kat || "Inne";
  });

  const cats = {};
  KATEGORIE.forEach(k => { cats[k] = { stock: 0, inDev: 0, broken: 0 }; });

  Object.entries(snState).forEach(([sn, st]) => {
    const k = snKat[sn] || "Inne";
    if (!cats[k]) cats[k] = { stock: 0, inDev: 0, broken: 0 };
    if (["PRZYJĘCIE","ZWROT"].includes(st)) cats[k].stock++;
    else if (["POBIERZ","WYMIANA","PRZEGLĄD"].includes(st)) cats[k].inDev++;
    else if (st === "ZEPSUTA") cats[k].broken++;
  });

  return cats;
}

// ── Alert przy niskim stanie ──────────────────────────
function checkAndAlertLowStock(kategoria) {
  if (!ADMIN_EMAIL || !kategoria) return;
  const stock = computeStock();
  const st = stock[kategoria];
  if (st && st.stock <= 1) {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: `⚠️ MAG//SYS: Niski stan — ${kategoria}`,
      body: `Kategoria: ${kategoria}\nW stocku: ${st.stock}\nW urządzeniach: ${st.inDev}\nZepsutych: ${st.broken}\n\nSprawdź arkusz.`
    });
  }
}

// ── Utwórz arkusz STOCK z formułami (jednorazowo) ─────
function setupStockSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const stock = getOrCreateSheet(ss, SHEET_STOCK);
  stock.clearContents();

  stock.getRange(1,1,1,5).setValues([["KATEGORIA","W STOCKU","W URZĄDZENIACH","ZEPSUTE","RAZEM"]]);
  stock.getRange(1,1,1,5)
       .setFontWeight("bold").setBackground("#0c0c0c").setFontColor("#3dd6f5");
  stock.setFrozenRows(1);

  KATEGORIE.forEach((kat, i) => {
    const row = i + 2;
    stock.getRange(row,1).setValue(kat);
    // Formuły liczące na bieżąco z arkusza LOG
    stock.getRange(row,2).setFormula(
      `=IFERROR(COUNTIFS(LOG!D:D,A${row},LOG!B:B,"PRZYJĘCIE")+COUNTIFS(LOG!D:D,A${row},LOG!B:B,"ZWROT")-COUNTIFS(LOG!D:D,A${row},LOG!B:B,"POBIERZ")-COUNTIFS(LOG!D:D,A${row},LOG!B:B,"WYMIANA"),0)`
    );
    stock.getRange(row,3).setFormula(
      `=IFERROR(COUNTIFS(LOG!D:D,A${row},LOG!B:B,"POBIERZ")+COUNTIFS(LOG!D:D,A${row},LOG!B:B,"WYMIANA")-COUNTIFS(LOG!D:D,A${row},LOG!B:B,"ZWROT"),0)`
    );
    stock.getRange(row,4).setFormula(
      `=IFERROR(COUNTIFS(LOG!D:D,A${row},LOG!B:B,"ZEPSUTA"),0)`
    );
    stock.getRange(row,5).setFormula(`=B${row}+C${row}+D${row}`);
  });

  SpreadsheetApp.getUi().alert("✅ Arkusz STOCK utworzony!");
}

// ── Helper ────────────────────────────────────────────
function getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

// ── Uruchom raz po wdrożeniu ──────────────────────────
function firstSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateSheet(ss, SHEET_LOG);
  setupStockSheet();
  Logger.log("Setup gotowy. Wdróż jako Aplikację internetową i skopiuj URL.");
}

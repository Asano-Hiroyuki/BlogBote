let db;
const params = new URLSearchParams(window.location.search);
const noteId = params.get("id");
const highlight = params.get("highlight");

// 初始化 IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("BlogNoteDB", 1);
    request.onupgradeneeded = e => {
      db = e.target.result;
      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes", { keyPath: "id" });
      }
    };
    request.onsuccess = e => { db = e.target.result; resolve(); };
    request.onerror = e => reject(e);
  });
}

// 根据 ID 获取笔记
async function loadNote(id) {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readonly");
    const store = tx.objectStore("notes");
    const request = store.get(id);
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e);
  });
}

// 渲染笔记
async function renderNote() {
  if (!noteId) {
    document.getElementById("content").innerHTML = "<p>Note ID not provided.</p>";
    return;
  }

  const note = await loadNote(noteId);
  if (!note || !note.content) {
    document.getElementById("content").innerHTML = "<p>Note not found.</p>";
    return;
  }

  let html = marked.parse(note.content);

  // 给图片添加 lazy 属性
  html = html.replace(/<img /g, '<img loading="lazy" ');

  // 高亮关键词
  if (highlight) {
    const reg = new RegExp(highlight, "gi");
    html = html.replace(reg, match => `<mark>${match}</mark>`);
  }

  const contentEl = document.getElementById("content");
  contentEl.innerHTML = html;

  // 滚动到第一个高亮
  const firstMark = contentEl.querySelector("mark");
  if (firstMark) firstMark.scrollIntoView({ behavior: "smooth", block: "center" });
}

renderNote();

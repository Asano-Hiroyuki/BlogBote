let db;

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

// 搜索并生成内容预览
async function searchNotes(keyword) {
  await initDB();
  return new Promise(resolve => {
    const tx = db.transaction("notes", "readonly");
    const store = tx.objectStore("notes");
    const results = [];
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        const note = cursor.value;
        if ((note.title && note.title.includes(keyword)) || (note.content && note.content.includes(keyword))) {
          const index = note.content.indexOf(keyword);
          let preview = note.content;
          if (index >= 0) {
            const start = Math.max(0, index - 30);
            const end = Math.min(note.content.length, index + keyword.length + 30);
            preview = note.content.slice(start, end).replace(new RegExp(keyword, "gi"), match => `<mark>${match}</mark>`);
          }
          results.push({ id: note.id, title: note.title, preview });
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
}

// 渲染搜索结果
function renderResults(results) {
  const container = document.getElementById("results");
  container.innerHTML = "";
  if (!results.length) { container.innerHTML = "<p>No notes found.</p>"; return; }
  results.forEach(note => {
    const div = document.createElement("div");
    div.className = "note-item";

    const titleEl = document.createElement("div");
    titleEl.textContent = note.title;
    titleEl.style.fontWeight = "bold";
    div.appendChild(titleEl);

    const previewEl = document.createElement("div");
    previewEl.innerHTML = note.preview;
    previewEl.style.fontSize = "0.9em";
    div.appendChild(previewEl);

    div.addEventListener("click", () => {
      const encodedId = encodeURIComponent(note.id);
      const encodedKeyword = encodeURIComponent(document.getElementById("searchInput").value.trim());
      chrome.tabs.create({ url: chrome.runtime.getURL(`view.html?id=${encodedId}&highlight=${encodedKeyword}`) });
    });

    container.appendChild(div);
  });
}

document.getElementById("searchInput").addEventListener("input", async e => {
  const keyword = e.target.value.trim();
  if (!keyword) { document.getElementById("results").innerHTML = ""; return; }
  const results = await searchNotes(keyword);
  renderResults(results);
});

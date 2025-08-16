let db;

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

// 保存 Markdown 到 IndexedDB 并下载到本地
async function saveMarkdownNote(html, url) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const article = new Readability(doc).parse();

  const turndownService = new TurndownService();
  const markdown = turndownService.turndown(article.content);

  // 1️⃣ 保存到 IndexedDB
  const note = {
    id: url,
    title: article.title || url,
    content: markdown,
    url
  };
  const tx = db.transaction("notes", "readwrite");
  tx.objectStore("notes").put(note);

  // 2️⃣ 保存到本地下载文件夹下 WebNotes 子目录
  const filename = `WebNotes/${article.title ? article.title.replace(/[\\/:*?"<>|]/g, "_") : "note"}.md`;
  chrome.downloads.download({
    url: 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown),
    filename: filename,
    saveAs: false  // 如果希望弹出“另存为”，改成 true
  });
}

// 获取当前页面 HTML
async function getActivePageHTML() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({ html: document.documentElement.outerHTML, url: location.href })
  });
  return result;
}

// 保存按钮
document.getElementById("saveBtn").addEventListener("click", async () => {
  await initDB();
  const { html, url } = await getActivePageHTML();
  await saveMarkdownNote(html, url);
  alert("Blog saved as Markdown!");
});

// 搜索按钮
document.getElementById("searchBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("search.html") });
});

// 导入 Markdown
document.getElementById("importFile").addEventListener("change", async e => {
  if (!db) await initDB();
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async evt => {
    const content = evt.target.result;
    const note = { id: file.name, title: file.name, content, url: file.name };

    // 保存到 IndexedDB
    const tx = db.transaction("notes", "readwrite");
    tx.objectStore("notes").put(note);

    // 下载到本地
    chrome.downloads.download({
      url: 'data:text/markdown;charset=utf-8,' + encodeURIComponent(content),
      filename: `WebNotes/${file.name}`,
      saveAs: false
    });

    alert("Markdown imported and saved locally!");
  };
  reader.readAsText(file);
});

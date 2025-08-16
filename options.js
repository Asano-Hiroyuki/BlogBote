document.addEventListener("DOMContentLoaded", async () => {
  const checkbox = document.getElementById("priorityDownload");
  const status = document.getElementById("status");

  const result = await chrome.storage.local.get(["priorityDownload"]);
  checkbox.checked = result.priorityDownload || false;

  document.getElementById("saveBtn").addEventListener("click", async () => {
    await chrome.storage.local.set({ priorityDownload: checkbox.checked });
    status.textContent = "Settings saved!";
    setTimeout(() => status.textContent = "", 2000);
  });
});

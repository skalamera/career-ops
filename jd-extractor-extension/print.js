const params = new URLSearchParams(location.search);
const key = params.get("key");

if (!key) {
  document.body.textContent = "No content key provided.";
} else {
  chrome.storage.local.get({ [key]: null }, (data) => {
    const html = data[key];
    chrome.storage.local.remove(key);

    if (!html) {
      document.body.textContent = "Content not found — it may have already been loaded.";
      return;
    }

    // Inject floating Save-as-PDF button + auto-print trigger before </body>
    const enhanced = html.replace("</body>", `
<style>
  @media print { #_tc_btn { display: none !important; } }
  #_tc_btn {
    position: fixed; bottom: 24px; right: 24px; z-index: 99999;
    background: linear-gradient(135deg, #2dd4bf, #8b5cf6);
    color: #fff; border: none; padding: 12px 22px;
    border-radius: 8px; font: 600 13px/1 system-ui, sans-serif;
    cursor: pointer; box-shadow: 0 4px 16px rgba(139,92,246,.4);
    letter-spacing: 0.02em; transition: opacity 0.15s;
  }
  #_tc_btn:hover { opacity: 0.88; }
</style>
<button id="_tc_btn" onclick="window.print()">Save as PDF \u2193</button>
<script>
  // Auto-trigger after Google Fonts finish loading
  document.fonts.ready.then(function() {
    setTimeout(function() { window.print(); }, 450);
  });
<\/script>
</body>`);

    document.open();
    document.write(enhanced);
    document.close();
  });
}

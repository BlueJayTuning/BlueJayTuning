(function injectMemoField() {
  const params = new URLSearchParams(location.search);
  const memo = params.get("code"); // don't return early if null

  const trySetMemo = () => {
    const memoEl = document.getElementById("memo");
    if (memoEl && memo) {
      memoEl.value = memo.toUpperCase();
      console.log("✅ Set memo field to:", memo);
      return true;
    }
    return false;
  };

  // Try once immediately
  if (trySetMemo()) return;

  // Retry every 100ms up to 5 seconds
  let attempts = 0;
  const maxAttempts = 50;
  const interval = setInterval(() => {
    if (trySetMemo() || ++attempts >= maxAttempts) {
      clearInterval(interval);
      if (attempts >= maxAttempts) {
        console.warn("❌ Memo field not found after waiting.");
      }
    }
  }, 100);
})();

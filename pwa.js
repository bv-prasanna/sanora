(() => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(() => {
      const status = document.getElementById("pwaStatus");
      if (status) status.textContent = "Offline app support could not be enabled on this device.";
    }));
  }
  let installPrompt = null;
  const button = document.getElementById("pwaInstallButton");
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    if (button) button.hidden = false;
  });
  button?.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    button.hidden = true;
  });
  window.addEventListener("appinstalled", () => {
    if (button) button.hidden = true;
    const status = document.getElementById("pwaStatus");
    if (status) status.textContent = "Sanora Spaces has been added to your device.";
  });
})();

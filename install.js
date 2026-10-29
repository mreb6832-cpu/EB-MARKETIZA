(function () {
  let deferredPrompt = null;

  function createInstallButton() {
    if (document.getElementById("ebInstallApp")) return;

    const button = document.createElement("button");
    button.id = "ebInstallApp";
    button.type = "button";
    button.textContent = "Install EB-MARKETIZA";
    button.style.cssText =
      "position:fixed;right:16px;bottom:16px;z-index:9999;" +
      "border:0;border-radius:10px;padding:12px 16px;" +
      "background:#ff5a00;color:#fff;font-weight:700;" +
      "font-size:14px;box-shadow:0 4px 14px rgba(0,0,0,.18);cursor:pointer;";

    button.onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      button.remove();
    };

    document.body.appendChild(button);
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    createInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    document.getElementById("ebInstallApp")?.remove();
    deferredPrompt = null;
  });
})();

chrome.contextMenus.create({
  id: "create-label",
  title: "Create Label",
  contexts: ["selection"],
});

chrome.contextMenus.create({
  id: "delete-label",
  title: "Delete Label",
  contexts: ["selection"],
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "create-label") {
    //TODO: send message to contentScript to create label
  } else if (info.menuItemId === "delete-label") {
    //TODO: send message to contentScript to delete label
  }
});

chrome.contextMenus.remove("my-context-menu");
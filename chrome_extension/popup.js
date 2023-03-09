/**--------------------------------------------
 *               AUTHENTICATION FLOW
 *---------------------------------------------**/
const app = document.getElementById("root");

const login = document.getElementById("login");

const loginForm = document.getElementById("login-form");

const backend = 'https://data-science-theta.vercel.app/api'

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
}


const createUser = async (email) => {
  const requestOptions = {
    method: "POST",
    body: JSON.stringify({
      email
    }),
    headers: {
      "Content-Type": "application/json"
    }
  };
  try {
    const res = await fetch(`${backend}/create-user`, requestOptions);
    const { msg } = await res.json();
  } catch(error) {
    setErrText('Error while creating user');
    console.debug("Error while creating user", error);
  }
}

const setErrText = (text) => {
  const errText = document.getElementById('err-text');
  errText.innerText = text;
}

onload = async function () {
  const isRegistered = await getDataFromStorage("email");
  if (
    typeof isRegistered === "object" &&
    Object.keys(isRegistered).length === 0
  ) {
    app.style.display = "none";
    login.style.display = "block";

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(event.target);
      const email = data.get("email");
      if(email === '') {
        return setErrText('Please enter your email');
      }
      await createUser(email);
      await setDataToStorage("email", email);
      app.style.display = "block";
      login.style.display = "none";
    });
  }
};

const startStopBtn = document.getElementById("start_annotation");
const saveAnnotationBtn = document.getElementById("save_annotation");

startStopBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log("clicked popup");

  remark_start();
});

const uploadFile = (file, labelFile) => {
  var myHeaders = new Headers();
  myHeaders.append("email", "ravi.lamkoti@contentstack.com");

  var formdata = new FormData();
  formdata.append("image", file, "Screenshot 2023-02-06 at 4.35.42 PM.png");
  formdata.append("label", labelFile, "ExtensionsMicroservice.txt");

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: formdata,
    redirect: 'follow'
  };

  fetch("http://localhost:3000/api/submit", requestOptions)
    .then(response => response.text())
    .then(result => console.log(result))
    .catch(error => console.log('error', error));
}

saveAnnotationBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const tab = await getCurrentTab();
  const labels = await getLabels(tab);

  const labelFile = new File([labels], 'label.txt', { type: 'text/plain' })
  //DISABLE: LABELING CSS WHILE SCREENSHOT
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const style = document.createElement('style');
      style.setAttribute('id', 'remark-styles');
      style.innerHTML = `
        [data-remark-annotation]:after { display: none; }
      `
      document.head.appendChild(style);
    }
  })
  
  const dataSrc = await Screenshot(tab);
  const file = dataURLtoFile(dataSrc, tab['url'].split('/').join('-') + '.png');

  // downloadFile(file);
  // downloadFile(labelFile);

  await uploadFile(file, labelFile);

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const style = document.getElementById('remark-styles');
      style.parentElement.removeChild(style);
    }
  })
});

async function remark_start() {
  // Check if the extension is already running
  const running = getDataFromStorage("remark_running");
  if (running === true) {
    return;
  }

  setDataToStorage("remark_running", true);

  // Configure the settings and store them for this session
  const remark_settings = getSettings();
  setDataToStorage("remark_settings", remark_settings);

  const temp = await getDataFromStorage("remark_settings");

  // Execute the contentScript
  try {
    const curTab = await getCurrentTab();
    chrome.scripting.executeScript({
      target: {
        tabId: curTab.id,
      },
      files: ["scripts/contentScript.js"],
    });
    chrome.scripting.insertCSS({
      target: {
        tabId: curTab.id,
      },
      files: ["scripts/style.css"],
    });
  } catch (e) {
    console.log("chrome error : ", e.message);
  }

  window.close();
}

function remark_destroy() {
  setDataToStorage("remark_running", false);
  return;

  // Stop annotation process

  // Save the current state (annotations)

  // Probably push to server at this point

  // Reset global variables
}

function getSettings() {
  const inps = document.querySelectorAll(".remark_toggle_checkbox");
  let remark_settings = {};
  console.log(inps);

  Array.from(inps).forEach((ele) => {
    if (ele.id) {
      console.log(ele.id, ele.checked);
      remark_settings[ele.id] = ele.checked;
    }
  });

  return remark_settings;
}

async function getCurrentTab() {
  let queryOptions = { active: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function setDataToStorage(key, value) {
  try {
    // [k] is a computed property.
    // Without it, we can not set dynamic keys.
    chrome.storage.sync.set({
      [key]: value,
    });
  } catch (e) {
    console.log("chrome error : ", e.message);
  }
}

function getDataFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], function (res) {
      resolve(res);
    });
  });
}
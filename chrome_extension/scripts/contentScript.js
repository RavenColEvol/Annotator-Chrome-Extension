//* GLOBAL VARIABLE DECLARATIONS

let REMARK_SETTINGS;
let annotations = [];
let SELECTION_DOM_STYLE_TAG = null;
let ANNOTATIONS = ["SECTION", "BUTTON", "TITLE", "TEXT", "IMG", "LINK"];
const DOM_ANNOTATIONS = new WeakMap();
let currSelectedDOM = undefined;
const backend = 'https://data-science-theta.vercel.app/api'

const handleBackspace = (e) => {
  e.preventDefault();
  if (
    !currSelectedDOM ||
    !currSelectedDOM.hasAttribute("data-remark-annotation")
  )
    return;
  currSelectedDOM.removeAttribute("data-remark-annotation");
};

//* Declaring it on top make it available
//TODO: make it class based
function Sidebar() {
  this.sidebar = document.createElement("fragment");
  this.insertSidebarDOM();
  document.body.appendChild(this.sidebar);
  return this;
}

Sidebar.init = function () {
  const sidebar = new Sidebar();
  const sidebarDOM = sidebar.sidebar;
  sidebarDOM
    .querySelector("#remark_standard_modal_close_btn")
    .addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      sidebar.close();
    });
  sidebarDOM.querySelector("#groupByClass").addEventListener("click", (e) => {
    e.preventDefault();
    const checkbox = sidebarDOM.querySelector(
      '#groupByClass input[type="checkbox"]'
    );
    checkbox.checked = !checkbox.checked;
    console.log("checkbox", checkbox);
  });
  sidebarDOM.querySelector("#applyLabel").addEventListener("click", (event) => {
    event.preventDefault();
    const formEl = sidebarDOM.querySelector("#sidebar-form");
    const data = new FormData(formEl);

    const groupByClass = data.get("groupByClass") === "on";
    const annotationType = data.get("annotation");

    if (!groupByClass) {
      if (!currSelectedDOM) return;
      currSelectedDOM.setAttribute("data-remark-annotation", annotationType);
      return;
    }

    const selectedDOMClass = getDOMClassName(currSelectedDOM);
    const elements = Array.from(document.querySelectorAll(selectedDOMClass));
    for (const el of elements) {
      el.setAttribute("data-remark-annotation", annotationType);
    }
  });

  sidebarDOM.querySelector('#createLabel').addEventListener('click', async (event) => {
    event.preventDefault();
    const newLabel = sidebarDOM.querySelector('#remark-new-label').value;
    await createAndAddNewLabel(newLabel);
  })

  sidebarDOM
    .querySelector("#removeLabel")
    .addEventListener("click", handleBackspace);

  return sidebar;
};

Sidebar.prototype.open = function () {
  this.sidebar
    .querySelector("#remark_annotations_sidebar")
    .classList.add("remark_sidebar__open");
};

Sidebar.prototype.close = function () {
  this.sidebar
    .querySelector("#remark_annotations_sidebar")
    .classList.remove("remark_sidebar__open");
};

Sidebar.prototype.isOpen = function () {
  return this.sidebar
    .querySelector("#remark_annotations_sidebar")
    ?.classList.contains("remark_sidebar__open");
};

Sidebar.prototype.insertSidebarDOM = function () {
  const that = this;
  this.sidebar.innerHTML = `
  <div class="remark_standard_sidebar ${
    that.isOpen() ? "remark_sidebar__open" : ""
  }" id="remark_annotations_sidebar">
    <form id='sidebar-form'>
				<div class="remark_sidebar_modal_header">
						<h3 class="remark_standard_sidebar_title">ANNOTATION DATA</h3>
						<div class="remark_standard_sidebar_actions">
								<span class="remark_close_btn" id="remark_standard_modal_close_btn">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="remark_close_btn"><path fill="currentColor" d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6L6.4 19Z" class="remark_"/></svg>
								</span>
						</div>
				</div>
				<div class="remark_standard_modal_body remark_standard_sidebar_body remark_standard_sidebar_body_full" id="remark_sidebar_body">
						<div class="remark_form_fields">
								<label for="annotation_id" class="remark_form_label">Component Type</label>
								<select name='annotation' id='select-dropdown'>
										${ANNOTATIONS.map(
                      (annotation) =>
                        `<option value="${annotation}">${annotation}</option>`
                    )}
								</select>
						</div>
            <div id="groupByClass">
              <input type="checkbox" name="groupByClass">
              <label for="groupByClass">Add Label to all highlighted at once.</label><br>
            </div>
            <div class='create_label'>
              <input type='text' placeholder='New Label' id='remark-new-label' />
              <button id='createLabel'>Create Label</button>
            </div>
				</div>
        <div class='btn-container'>
          <button id='applyLabel' type='submit'>Apply Label</button> 
          <button id='removeLabel'>Remove Label</button> 
        </div>
        </form>
		</div>
	`;
};

Sidebar.prototype.updateAnnotations = function () {
  const sidebarDOM = sidebar.sidebar;
  sidebarDOM.querySelector("#select-dropdown").innerHTML = ANNOTATIONS.map(
    (annotation) => `<option value="${annotation}">${annotation}</option>`
  ).join('');
};

let sidebar = Sidebar.init();

//* PROJECT INIT
(async () => {
  console.log("from foreground : init . . .");
  let settings = await getDataFromStorage("remark_settings");
  settings = settings["remark_settings"];
  console.log("outside storage : ", settings);
  // let it happen in background
  setAnnotations();
  // update annotations
  remark_init(settings);
})();

function remark_init(settings) {
  REMARK_SETTINGS = settings;
  console.log(
    "DOM check and Settings check : ",
    document.body,
    REMARK_SETTINGS
  );
  removeAllExistingModals();
  addAllClasses();
  initializeExtensionDOM();
  startAnnotationProcess();
}

function startAnnotationProcess() {
  addEventListener("keydown", keyPressListener);

  document.body.addEventListener("click", clickListener, true);
  document.body.addEventListener("mouseover", mouseOverListener);
  document.body.addEventListener("mouseout", mouseOutListener);
}

// ******************* Listeners *******************

function clickListener(e) {
  const lastEl = e.composedPath()[0];
  const isCursorInsideSidebar = sidebar.sidebar.contains(lastEl);
  if (isCursorInsideSidebar) return;
  e.preventDefault();
  e.stopPropagation();
  handleLabelCreate(e);
}

function mouseOverListener(e) {
  e.preventDefault();
  e.stopPropagation();
  let target = e.target;
  const isCursorInsideSidebar = sidebar.sidebar.contains(target);
  if (isCursorInsideSidebar || sidebar.isOpen()) return;

  if (e.target.tagName === 'IMG') {
    target = e.target.parentElement;
  }
  console.log('tagName', target);

  setSelectionDOMOverEl(target);
}

function mouseOutListener(e) {
  e.preventDefault();
  e.stopPropagation();
}

function keyPressListener(e) {
  if (e.key === "Escape") {
    removeAllExistingModals();
  }

  switch (e.key) {
    case "Backspace":
      handleBackspace();
      return;
    default:
      break;
  }
}

function removeHTMLElement(ele) {
  if (!ele) return;
  ele.parentElement.removeChild(ele);
  return;
}

// ******************* Handlers ********************

function addLabel(t, annotations) {
  const rect = t.getBoundingClientRect();
  const x = Math.round(rect.x),
    y = Math.round(rect.y),
    w = Math.round(rect.width),
    h = Math.round(rect.height);
  console.log(x, y, w, h);

  const d = {
    id: Math.round(Math.random() * 10000),
    type: t.tagName.toLowerCase(),
    coordinates: [x, y, w, h],
    text: t.innerText,
    parent: t.parentNode.tagName.toLocaleLowerCase(),
  };

  annotations.push(d);
  t.dataset.annotation_id = d["id"];

  return annotations;
}

function deleteLabel(t, annotations) {
  const annotation_id = Number(t.dataset.annotation_id);

  annotations = annotations.filter(function (ele) {
    return ele.id != annotation_id;
  });

  delete t.dataset.annotation_id;

  return annotations;
}

// *************** Utility functions ***************

function createCSSClass(name, rules) {
  var style = document.createElement("style");
  style.type = "text/css";
  document.getElementsByTagName("head")[0].appendChild(style);
  if (!(style.sheet || {}).insertRule)
    (style.styleSheet || style.sheet).addRule(name, rules);
  else style.sheet.insertRule(name + "{" + rules + "}", 0);
}

function addAllClasses() {
  createCSSClass(
    ":root",
    `
        --remark-color-primary: #0d6efd;
        --remark-color-primary-lighter: #5498ff;
        --remark-color-primary-darker: #0b5dd7;
        --remark-color-success: #5ec576;
        --remark-color-success-darker: #399e66;
        --remark-color-warning: #ffcb03;
        --remark-color-warning-darker: #eaac00;
        
        --remark-color-danger: #ff585f;
        --remark-color-danger-darker: #fd424b;
        --remark-color-grey-light-3: #f2f2f2;
        --remark-color-grey-light-2: #d0d0d0;
        --remark-color-grey-light-1: #9c9c9c;
        --remark-color-grey: #808080;
        --remark-color-grey-dark-1: #6c6c6c;
        --remark-color-grey-dark-2: #444444;
        --remark-color-grey-dark-3: #2d2c2c;
        --remark-color-grey-dark-4: #141313;
        --remark-color-black: #000000;
        --remark-color-white: #FFFFFF;
        --remark-color-danger-opacity: #ff58602d;
        --gradient-primary: linear-gradient(to top left, #39b385, #9be15d);
        --gradient-secondary: linear-gradient(to top left, #ffb003, #ffcb03);
        --remark-default-box-shadow-light: rgba(120, 123, 127, 0.2) 0px 8px 16px;
        --remark-default-box-shadow: rgba(75, 77, 80, 0.2) 0px 8px 24px;
        --remark-default-sanserif-font: Arial, Helvetica, sans-serif;
    `
  );

  createCSSClass(
    ".highlight_element_light",
    `
        cursor: crosshair;
        border-radius: 0.4rem;
        padding: 0.4rem;
        background: rgba(13, 109, 253, 0.269);
        transition: background-color 125ms ease-in-out 0s;
        z-index: 100000;
    `
  );

  createCSSClass(
    ".highlight_element_strong",
    `
        outline: solid 1px #ff28009c; 
        border-radius: 0.4rem; 
        padding: 0.4rem; 
        cursor: crosshair;
        z-index: 100000;
    `
  );

  createCSSClass(
    ".remark_standard_modal",
    `
        display: flex;
        flex-direction: column;
        background: white;
        color: black;
        justify-content: center;
        align-items: center;
        padding: 2rem;
        border-radius: 1.2rem;
        width: 22rem;
        height: auto;
        position: absolute;
        top: 14%;
        left: 40%;
        box-shadow: rgb(149 157 165 / 20%) 0px 8px 24px;
        z-index: 1000000;
    `
  );

  createCSSClass(
    ".remark_form_input",
    `        
        padding: 1rem 2rem 1.2rem 1rem;
        font-family: var(--remark-default-sanserif-font);
        appearance: none;
        height: 2.8rem;
        width: 100%;
        border-radius: 0.6rem;
        background-color: var(--remark-color-white);
        margin: 0.4rem 0rem 1.4rem 0rem;
        transition: border 0.2s ease-in 0s;
        border: 1px solid var(--remark-color-grey-light-1);
        font-size: 1rem;
        color: var(--remark-color-grey);
        outline: 0px !important;
        
    `
  );

  createCSSClass(
    ".remark_standard_button",
    `
        background-color: var(--remark-color-primary);
        font-size: 1rem;
        color: var(--remark-color-white);
        font-family: inherit;
        font-weight: 500;
        border: none;
        padding: 1.25rem 4.5rem;
        border-radius: 0.8rem;
        cursor: pointer;
        transition: all 0.1s ease 0s;
        margin: 1rem 0rem 0rem;
        width: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        height: 3.2rem;

    `
  );

  createCSSClass(
    ".remark_standard_button:hover",
    `
        background-color: var(--remark-color-primary) !important;
        transform: scale(1.04);
    `
  );

  createCSSClass(
    ".remark_standard_button:active",
    `
        transform: scale(1.0) !important;
    `
  );

  createCSSClass(
    ".remark_standard_button:focus",
    `
        background-color: var(--remark-color-primary) !important
        transform: scale(1.0);
    `
  );

  createCSSClass(
    ".remark_standard_modal_title",
    `
        display: flex;
        flex-direction: row;
        justify-content: start;
        overflow-wrap: break-word;
        padding: 0rem;
        margin: 1rem 0rem 2rem 0rem;
        font-size: 1.1rem;
        height: inherit;
        line-height: 0rem;
        font-weight: bold;
    `
  );

  createCSSClass(
    ".remark_form_label",
    `
        font-family: var(--remark-default-sanserif-font);
        font-size: 12px;
        color: var(--remark-color-grey-light-1);
    `
  );

  createCSSClass(
    "#remark_tooltip",
    `
        display: flex;
        flex-direction: row;
        padding: 1rem;
        position: fixed;
        top: 2rem;
        left: 2rem;
        border-radius: 0.8rem;
        margin: 0rem 0rem 2rem;
        background-color: var(--remark-color-black);
        color: var(--remark-color-white);
        width: 10rem;
        height: 3.2rem;
        gap: 0.8rem;
        z-index: 10000;
    `
  );

  createCSSClass(
    ".remark_confirm_grouping",
    `
        display: flex;
        flex-direction: row;
        gap: 1.2rem;
        padding: 1rem;
        position: inherit;
        top: 0rem;
        right: 0rem;
        border-radius: 0.8rem;
        margin: 0rem 0rem 0rem;
        background-color: #000000;
        color: var(--remark-color-white);
        width: 9rem;
        height: 3.2rem;
        z-index: 10000;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        transition: all 125ms ease-in-out 0s;
    `
  );

  createCSSClass(
    ".remark_confirm_grouping:hover",
    `
        transform: scale(1.05);
    `
  );

  createCSSClass(
    ".remark_confirm_grouping:active",
    `
        transform: scale(1.0);
    `
  );

  createCSSClass(
    ".remark_grouping_options",
    `
        background: var(--remark-color-grey-dark-4);
        padding: 1rem;
        height: 1rem;
        width: 10rem;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 0.5rem;
        transition: all 125ms ease-in-out 0s;
        cursor: pointer;
    `
  );

  createCSSClass(
    ".remark_grouping_options:hover",
    `
        transform: scale(1.05);
    `
  );

  createCSSClass(
    ".remark_grouping_options",
    `
        transform: scale(1.0);
    `
  );

  createCSSClass(
    ".remark_standard_sidebar",
    `
        position: fixed;
        top: 0px;
        right: -100%;
        width: 20rem;
        background-color: var(--remark-color-white);
        color: var(--remark-color-grey-dark-1);
        border-radius: 1rem;
        z-index: 100000000;
        height: 100vh;
        animation: 0.6s cubic-bezier(0.165, 0.84, 0.44, 1) 0s 1 normal forwards running remark_sidebar_animation;
        display: flex;
        overflow: hidden;
        flex-direction: column;
        padding: 2rem;
    `
  );

  createCSSClass(
    ".remark_sidebar__open",
    `
      right: 0;
    `
  );

  createCSSClass(
    "@keyframes remark_sidebar_animation",
    `
        from {
            width: 0px;
        }
        to {
            width: 20rem;
        }
    `
  );

  createCSSClass(
    ".remark_sidebar_modal_header",
    `
        padding: 1rem;
        height: 2rem;
        margin: 0rem -1rem 2rem 3rem;
        width: auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `
  );

  createCSSClass(
    ".remark_standard_sidebar_actions",
    `
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 10%;
    `
  );

  createCSSClass(
    ".remark_standard_sidebar_title",
    `
        display: flex;
        flex-direction: row;
        justify-content: start;
        overflow-wrap: break-word;
        margin: 0.4rem 0rem 0rem;
        font-size: 0.8rem;
        font-weight: bold;
    `
  );

  createCSSClass(
    ".remark_close_btn",
    `
        margin: 0.4rem 0rem 0rem 0rem;
        cursor: pointer;
    `
  );

  createCSSClass(
    ".remark_standard_sidebar_body",
    `
        height: 80%;
        overflow-x: hidden;
        overflow-y: scroll;
        scrollbar-width: none;    
    `
  );

  createCSSClass(
    ".remark_standard_sidebar_body_full",
    `
        height: 100%;
        overflow: hidden;
    `
  );

  createCSSClass(
    ".remark_form_fields",
    `
        margin: 0rem 0rem 0rem 0rem;
    `
  );

  createCSSClass(
    ".remark_form_input:focus",
    `
        border: 0.5px solid var(--remark-color-primary);
    `
  );

  createCSSClass(
    ".remark_form_label",
    `
        font-family: var(--remark-default-sanserif-font);
        font-size: 0.8rem;
        color: var(--remark-color-grey-light-2);  
    `
  );

  createCSSClass(
    "#remark_standard_modal_close_btn",
    `
        transition: all 0.1s ease 0s;
    `
  );

  createCSSClass(
    "#remark_standard_modal_close_btn:hover",
    `
        transform: scale(1.1);
    `
  );

  createCSSClass(
    "#remark_standard_modal_close_btn:active",
    `
        transform: scale(1.0);
    `
  );

  createCSSClass(
    "[data-remark-annotation]",
    `
      position: relative;
    `
  );

  createCSSClass(
    "[data-remark-annotation]:after",
    `
      content: attr(data-remark-annotation);
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      outline: 2px solid red;
      pointer-event: none;
      font-size: 1rem;
      text-align: left;
      pointer-events:none;
    `
  );
}

function getAnnotationByID(annotation_id, annotations) {
  for (let ele of annotations) {
    if (Number(annotation_id) === ele["id"]) {
      return ele;
    }
  }
  return;
}

function removeAllExistingModals() {
  sidebar.close();
}

// ****************** Chrome APIs ******************

function setDataToStorage(key, value) {
  try {
    // [k] is a computed property.
    // Without it, we can not set dynamic keys.
    chrome.storage.local.set({
      [key]: value,
    });
  } catch (e) {
    console.log("chrome error : ", e.message);
  }
}

function getDataFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], function (res) {
      resolve(res);
    });
  });
}

function initializeExtensionDOM() {
  // INITIALIZE SELECTION DOM
  const style = document.createElement("style");
  SELECTION_DOM_STYLE_TAG = style;
  document.body.appendChild(style);
}

function getDOMClassName(dom) {
  let classes = dom.getAttribute("class");
  classes = classes ? classes.split(" ") : [];
  classes.unshift(dom.tagName);
  return classes.join(".");
}

function setSelectionDOMOverEl(el) {
  if (!el) return;
  const { isCollapsed, anchorNode, focusNode } = document.getSelection();
  let highlightDOM = el;
  if (!isCollapsed) {
    const commonParent = getLCA(anchorNode, focusNode);
    highlightDOM = commonParent;
  }

  currSelectedDOM = highlightDOM;
  const classSelector = getDOMClassName(highlightDOM);
  SELECTION_DOM_STYLE_TAG.innerHTML = `
    ${classSelector} {
        position: relative;
    }
    
    ${classSelector}::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        pointer-events: none;
        background: rgba(128,203,196, .5);
        border: 1px solid rgba(128,203,196, .8);
    }
  `;
}

function getDepth(node) {
  let depth = 0;
  while (node.parentNode) {
    depth++;
    node = node.parentNode;
  }
  return depth;
}

function getLCA(elem1, elem2) {
  let depth1 = getDepth(elem1);
  let depth2 = getDepth(elem2);

  // Make both elements at the same depth
  while (depth1 > depth2) {
    elem1 = elem1.parentNode;
    depth1--;
  }
  while (depth2 > depth1) {
    elem2 = elem2.parentNode;
    depth2--;
  }

  // Move up both elements until their parent is the same
  while (elem1 !== elem2) {
    elem1 = elem1.parentNode;
    elem2 = elem2.parentNode;
  }

  return elem1;
}

function handleLabelCreate(event) {
  sidebar.open();
}

function handleLabelDelete(event) {
  console.log("handle Label delete");
}

function handleLabelUpdate(event) {
  console.log("handle label update");
}

async function setAnnotations() {
  var requestOptions = {
    method: "GET",
    redirect: "follow",
  };
  try {
    const res = await fetch(`${backend}/labels`, requestOptions);
    const json = await res.json();
    ANNOTATIONS =  json["labels"];
    sidebar.updateAnnotations();
  } catch(err) {
    console.debug("Error while fetching labels", err);
  }
}

async function createAndAddNewLabel(label) {
  var requestOptions = {
    method: "POST",
    body: JSON.stringify({
      title: label
    }),
    headers: {
      "Content-Type": "application/json"
    }
  };
  try {
    const res = await fetch(`${backend}/labels`, requestOptions);
    await res.json();
    ANNOTATIONS.push(label.toLocaleLowerCase());
    sidebar.updateAnnotations();
  } catch(error) {
    console.debug("Error while creating label", error);
  }
}